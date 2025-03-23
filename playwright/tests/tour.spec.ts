import { type Locator, type Page, expect, test } from "@playwright/test";
import { formatDate } from "../../frontend/src/utils/Date";

const mostUsedCurrencies = [
	"BRL Brazilian Real",
	"USD United States Dollar",
	"EUR Euro",
	"BTC Bitcoin",
	"ETH Ethereum",
	"JPY Japanese Yen",
	"GBP British Pound Sterling",
	"AUD Australian Dollar",
	"CAD Canadian Dollar",
	"CHF Swiss Franc",
	"CNY Chinese Yuan",
	"SEK Swedish Krona",
	"NZD New Zealand Dollar",
	"MXN Mexican Peso",
	"SGD Singapore Dollar",
	"HKD Hong Kong Dollar",
	"NOK Norwegian Krone",
	"KRW South Korean Won",
	"TRY Turkish Lira",
	"RUB Russian Ruble",
	"INR Indian Rupee",
	"ZAR South African Rand",
	"PHP Philippine Peso",
	"CZK Czech Koruna",
	"IDR Indonesian Rupiah",
	"MYR Malaysian Ringgit",
	"HUF Hungarian Forint",
	"ISK Icelandic Krona",
	"HRK Croatian Kuna",
	"BGN Bulgarian Lev",
	"ILS Israeli New Shekel",
	"CLP Chilean Peso",
	"AED UAE Dirham",
	"SAR Saudi Riyal",
	"RON Romanian Leu",
	"COP Colombian Peso",
	"THB Thai Baht",
	"VND Vietnamese Dong",
	"EGP Egyptian Pound",
	"PEN Peruvian Sol",
	"PKR Pakistani Rupee",
	"KWD Kuwaiti Dinar",
	"UAH Ukrainian Hryvnia",
	"BDT Bangladeshi Taka",
	"ARS Argentine Peso",
	"DZD Algerian Dinar",
	"MAD Moroccan Dirham",
	"JOD Jordanian Dinar",
	"BHD Bahraini Dinar",
	"OMR Omani Rial",
	"RSD Serbian Dinar",
];

// Utility functions
const classForTestIdTDs =
	(page: Page, testId: string) => async (index: number) =>
		await page
			.getByTestId(`inputContainer${testId}`)
			.nth(index)
			.evaluate((el) =>
				String(el?.parentElement?.className)
					.replace(/\s+/g, " ")
					.replace(/bg-background-/g, "bg---")
					.replace(/[\r\n\s]+/g, " ")
					.trim(),
			);

async function waitLoading(page: Page) {
	return await page.waitForFunction(
		(selector) => !document.querySelector(selector),
		"[data-testid=loadingProgress]",
	);
}

function Select(page: Page, testId: string, index = 0) {
	const select = () => page.getByTestId(testId).nth(index);
	const input = () => select().locator(".mn-select__input");
	const menuList = () => page.locator(".mn-select__menu-list");

	const isClosed = async () => await menuList().isHidden();
	const open = async () => {
		if (await isClosed()) {
			await select().click();
		}
	};

	const listOptions = async () =>
		await menuList().locator(".mn-select__option").allTextContents();
	const findMenuItem = (optionName: string, exact = true) =>
		menuList().getByText(optionName, { exact });
	const createNew = async (optionName: string) => {
		await input().fill(optionName);
		await input().press("Enter");
	};
	const currentValue = async () =>
		select().locator(".mn-select__single-value, .mn-select__placeholder").innerText();

	return {
		async value() {
			return await currentValue();
		},
		async options() {
			await open();
			return listOptions();
		},
		async create(optionName: string) {
			await open();
			await createNew(optionName);
			await isClosed();
		},
		async choose(optionName: string, exact = true, retries = 3) {
			try {
				await open();
				const option = findMenuItem(optionName, exact);
				await option.click({ timeout: 1000 });
				await isClosed();
			} catch (e) {
				if (e.message.includes("detached") && retries > 0) {
					console.warn(`Option detached, retrying choose... ${retries}`);
					await this.choose(optionName, exact, retries - 1);
				} else {
					throw e;
				}
			}
		},
		async chooseOrCreate(optionName: string) {
			await open();
			const option = () => findMenuItem(optionName, false);
			if ((await option().count()) > 0) {
				await this.choose(optionName, false);
			} else {
				await createNew(optionName);
			}
			await isClosed();
		},
	};
}

function Input(page: Page, testId: string, container?: Locator, index = 0) {
	const input = (container || page).getByTestId(testId).nth(index);

	return {
		async value() {
			return input.getAttribute("value");
		},
		async toHaveValue(value: string) {
			await expect(input).toHaveValue(value);
		},
		async change(value: string) {
			await input.click();
			await input.fill(value);
			await input.blur();
		},
	};
}

async function OpenMenuItem(page: Page, title: string) {
	const toggle = page.getByTestId("toggleMenu");
	if ((await toggle.getAttribute("data-expanded")) === "false") {
		await toggle.click();
	}
	return await page.getByText(title).click();
}

async function dismissNotification(page: Page, text: string) {
	await expect(page.getByTestId("mn-status-warning")).toContainText(text);
	const dismissIcon = () => page.getByTestId("mn-dismiss-status");
	expect(dismissIcon()).toBeVisible();
	await dismissIcon().click();
	expect(dismissIcon()).not.toBeVisible();
}

// Transaction helpers
async function insertTransactionOnAllTransactions(
	page: Page,
	index: number,
	fromAccountName: string,
	toAccountName: string,
	amount: string,
) {
	const editorFrom = Select(page, "editorFrom", index);
	await editorFrom.chooseOrCreate(fromAccountName);

	const editorTo = Select(page, "editorTo", index);
	await editorTo.chooseOrCreate(toAccountName);

	await Input(page, "editorAmount", undefined, index).change(amount);
}

async function insertTransactionOnReferenceAccount(
	page: Page,
	index: number,
	accountName: string,
	amount: string,
	memo?: string,
) {
	const editorAccount = Select(page, "editorAccount", index);
	await editorAccount.chooseOrCreate(accountName);

	await Input(page, "editorAmount", undefined, index).change(amount);
	if (memo) {
		await Input(page, "editorMemo", undefined, index).change(memo);
	}
}

// Test helpers
async function retrieveRowData(page: Page, columns: string[], index: number) {
	const getCellData = async (column: string) => {
		const isValueColumn = column.includes("Amount") || column.includes("Running") || column.includes("Memo") || column.includes("Date");
		const value = isValueColumn 
			? await Input(page, column, undefined, index).value()
			: await Select(page, column, index).value();
		
		const className = await classForTestIdTDs(page, column)(index);
		
		return `${column.replace("editor", "").toLowerCase()}: ${value} (${className})`;
	};

	const cellData = await Promise.all(columns.map(column => getCellData(column)));
	
	return cellData.join(" | ");
}

async function retrieveRowsData(page: Page, columns: string[]) {
	const rows = await page.getByTestId(columns[0]).all();
	return await Promise.all(
		Array.from({ length: rows.length }).map((_v, index) => retrieveRowData(page, columns, index))
	);
}

async function BudgetEditorSave(
	page: Page,
	name: string,
	currency: string,
	tag: string,
) {
	await page.getByTestId("addNewBudget").first().click();

	const budgetEditor = page.getByTestId("budgetEditorDrawer");
	await Input(page, "budgetName", budgetEditor).change(name);

	const budgetCurrency = Select(page, "budgetCurrency");
	expect(await budgetCurrency.options()).toEqual(mostUsedCurrencies);
	await budgetCurrency.choose(currency);

	const budgetTags = Select(page, "budgetTags");
	expect(await budgetTags.options()).toEqual([
		"Bakery",
		"Banco Moneeey",
		"Bitcoinss",
		"Gas Station",
		"Initial balance BRL",
		"Initial balance BTC",
		"MoneeeyCard",
	]);
	await budgetTags.choose(tag, false);

	await budgetEditor.getByTestId("budgetSave").click();
}

function tourNext(page: Page) {
	return page.getByTestId("nm-modal-card").getByTestId("next").click(); // Start Tour
}

async function completeLandingWizard(page: Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	// Select language
	expect(page.getByText("Select language")).toBeDefined();
	expect(page.getByTestId("languageSelector_pt")).toBeDefined();
	expect(page.getByTestId("languageSelector_es")).toBeDefined();
	expect(page.getByTestId("languageSelector_en")).toBeDefined();
	await page.getByTestId("languageSelector_es").click();
	await expect(page.getByTestId("ok-button")).toContainText("Ir a Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");

	// Select default currency
	await page.getByTestId("ok-button").click();
	expect(page.getByTestId("defaultCurrencySelector")).toBeDefined();
	const defaultCurrencySelector = Select(page, "defaultCurrencySelector");
	expect(await defaultCurrencySelector.options()).toEqual(mostUsedCurrencies);
	await defaultCurrencySelector.choose(mostUsedCurrencies[0]);
	await expect(page.getByTestId("ok-button")).toContainText("Continue");
	await page.getByTestId("ok-button").click();

	// Create two initial accounts
	await Input(page, "name").change("Banco Moneeey");
	expect(await Select(page, "editorCurrency").value()).toEqual(
		"BRL Brazilian Real",
	);
	await Input(page, "editorInitial_balance").change("1234,56");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("MoneeeyCard");
	expect(await Select(page, "editorCurrency").value()).toEqual(
		"BRL Brazilian Real",
	);
	await Input(page, "editorInitial_balance").change("2000,00");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("Bitcoinss");
	await Select(page, "editorCurrency").choose("BTC Bitcoin");
	await Input(page, "editorInitial_balance").change("0,123456789");
	expect(await Select(page, "editorCurrency").value()).toEqual("BTC Bitcoin");
	await page.getByTestId("save-and-close").click();

	await expect(page.getByText("Dashboard")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => {
		while (window.localStorage.length) {
			const key = window.localStorage.key(0);
			if (key) {
				window.localStorage.removeItem(key);
			}
		}
		window.indexedDB.deleteDatabase("_pouch_moneeey");
	});
});

test.describe("Moneeey", () => {
	test("Tour", async ({ page }) => {
		await completeLandingWizard(page);

		await page.getByTestId("start-tour").click(); // Start Tour

		expect(page.getByText("please edit the currencies")).toBeDefined();
		await tourNext(page); // Next after Edit Currencies

		// Accounts page
		expect(page.getByText("Now that we know the currencies")).toBeDefined();
		await tourNext(page); // Next on Edit accounts

		// Progress Tour to Transactions
		expect(page.getByText("start inserting transactions")).toBeDefined();

		await insertTransactionOnAllTransactions(page, 2, "Banco Moneeey", "Gas Station", "1234,56");
		await insertTransactionOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "78,69");
		await insertTransactionOnAllTransactions(page, 4, "Banco Moneeey", "Bakery", "11,11");

		// Progress Tour to Transactions
		await tourNext(page);
		expect(page.getByText("time to budget")).toBeDefined();

		// Cant progress because must create budget
		await tourNext(page);
		await dismissNotification(
			page,
			"Before continuing, click 'New Budget' and create a budget.",
		);

		// Create budgets
		await BudgetEditorSave(page, "Gas", mostUsedCurrencies[0], "Gas Station");
		await BudgetEditorSave(page, "Bakery", mostUsedCurrencies[0], "Bakery");

		const editorRemainingClass = classForTestIdTDs(page, "editorRemaining");

		// Allocate on budget and wait for calculated used/remaining
		expect(page.getByText("R$").first()).toBeDefined();
		await Input(page, "editorAllocated", undefined, 0).change("65,00");
		await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("89,8");
		await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue(
			"-24,80",
		);
		expect(await editorRemainingClass(0)).toEqual("bg---800 opacity-80 text-red-200");

		await Input(page, "editorAllocated", undefined, 1).change("5435,25");
		await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("1.234,56");
		await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue(
			"4.200,69",
		);
		expect(await editorRemainingClass(1)).toEqual("bg---600 opacity-80");

		// Go to Import
		await tourNext(page);
		expect(page.getByText("New import")).toBeDefined();

		// Finish on Transactions
		await tourNext(page);
		expect(page.getByText("Gas Station")).toBeDefined();

		// Close Tour
		await tourNext(page);

		// Tour is closed
		for (let i = 0; i < 3; i++) {
			if ((await page.getByTestId("nm-modal-title").count()) === 0) {
				return;
			}
		}
		expect(page.getByTestId("nm-modal-title")).toBeHidden();
	});

	test("Transactions", async ({ page }) => {
		await completeLandingWizard(page);

		// Click on MoneeeyCard account
		await page.getByText("BRL MoneeeyCard").click();

		// Add three transactions
		await insertTransactionOnReferenceAccount(page, 1, "Banco Moneeey", "3000,00");
		await insertTransactionOnReferenceAccount(page, 2, "Bakery123", "-60,00");
		await insertTransactionOnReferenceAccount(page, 3, "Ristorant88", "-128,00");
		await insertTransactionOnReferenceAccount(page, 4, "Playxbox421", "-7213,21", "game platform");
		await insertTransactionOnReferenceAccount(page, 5, "Cashbazk", "69,42", "cashback");

		// Wait running balance to be updated
		await Input(page, 'editorRunning', undefined, 5).toHaveValue("-2.331,79");

		// Assert classes for the table
		const referenceAccountColumns = [
			"editorDate",
			"editorAccount",
			"editorAmount",
			"editorRunning",
			"editorMemo",
		];
		const today = formatDate(new Date());
		expect(await retrieveRowsData(page, referenceAccountColumns)).toEqual([
			`date: ${today} (bg---800) | account: Banco Moneeey (bg---800) | amount: 3000 (bg---800 text-green-200) | running: 3000 (bg---800 text-green-200) | memo: (bg---800)`,
			`date: ${today} (bg---600) | account: Bakery123 (bg---600) | amount: -60 (bg---600 text-green-200) | running: 2940 (bg---600 text-green-200) | memo: (bg---600)`,
			`date: ${today} (bg---800) | account: Ristorant88 (bg---800) | amount: -128 (bg---800 text-red-200) | running: 2812 (bg---800 text-green-200) | memo: (bg---800)`,
			`date: ${today} (bg---600) | account: Playxbox421 (bg---600) | amount: -7213 (bg---600 text-red-200) | running: 2812 (bg---600 text-green-200) | memo: (bg---600)`,
			`date: ${today} (bg---800) | account: Cashbazk (bg---800) | amount: 69 (bg---800 text-red-200) | running: 2883 (bg---800 text-red-200) | memo: (bg---800)`,
			`date: ${today} (bg---600) | account: Banco Moneeey (bg---600) | amount: 2940 (bg---600 text-green-200) | running: 2940 (bg---600 text-red-200) | memo: (bg---600)`,
			`date: ${today} (bg---800) | account: (bg---800) | amount: (bg---800) | running: (bg---800) | memo: (bg---800)`
		]);
		// Go to All transactions and assert
		await OpenMenuItem(page, "All transactions");
		const allTransactionsColumns = [
			"editorDate",
			"editorFrom",
			"editorTo",
			"editorAmount",
			"editorMemo",
		];
		expect(await retrieveRowsData(page, allTransactionsColumns)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 2000 (bg---800) | memo: 2024-04-01;MoneeeyCard;2000 (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: Banco Moneeey (bg---600) | amount: 3000 (bg---600) | memo: 2024-04-02;Banco Moneeey;3000 (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo: 2024-04-03;Bitcoinss;0,12345678 (bg---800)`,
			`date: ${today} (bg---600) | from: Banco Moneeey (bg---600) | to: Playxbox421 (bg---600) | amount: -7213,21 (bg---600) | memo: 2024-04-04;Playxbox421;-7213,21 (bg---600)`,
			`date: ${today} (bg---800) | from: Cashbazk (bg---800) | to: Playxbox421 (bg---800) | amount: 69,42 (bg---800) | memo: 2024-04-05;Cashbazk;69,42 (bg---800)`,
			`date: ${today} (bg---600) | from: Banco Moneeey (bg---600) | to: Cashbazk (bg---600) | amount: -2940 (bg---600) | memo: 2024-04-06;Banco Moneeey;-2940 (bg---600)`,
			`date: ${today} (bg---800) | from: Banco Moneeey (bg---800) | to: Ristorant88 (bg---800) | amount: -128 (bg---800) | memo: 2024-04-07;Ristorant88;-128 (bg---800)`
		]);

		// Go to Banco Moneeey account and assert
		await OpenMenuItem(page, "BRL Banco Moneeey");
		expect(await retrieveRowsData(page, referenceAccountColumns)).toEqual([
			`date: ${today} (bg---800) | account: Initial balance BRL (bg---800) | amount: 2000 (bg---800) | running: 2000 (bg---800) | memo: 2024-04-01;MoneeeyCard;2000 (bg---800)`,
			`date: ${today} (bg---600) | account: Banco Moneeey (bg---600) | amount: 3000 (bg---600) | running: 5000 (bg---600) | memo: 2024-04-02;Banco Moneeey;3000 (bg---600)`,
			`date: ${today} (bg---800) | account: Bakery123 (bg---800) | amount: -60 (bg---800) | running: 4940 (bg---800) | memo: 2024-04-03;Bakery123;-60 (bg---800)`
		]);
	});

	test("Import", async ({ page }) => {
		await completeLandingWizard(page);

		await page.getByTestId("nm-modal-card").getByTestId("close").click(); // Close Tour

		await OpenMenuItem(page, "Import");

		const importFile = async (fileName: string) => {
			await page
				.getByTestId("importFile")
				.setInputFiles(`./fixture/${fileName}`);

			expect(
				page.getByText(fileName.substring(fileName.lastIndexOf("/"))),
			).toBeDefined();

			await waitLoading(page);
		};

		const updateEditorTos = async (options: Array<string | null>) => {
			for (const { option, index } of options.map((option, index) => ({
				option,
				index,
			}))) {
				if (option) {
					const sel = Select(page, "editorTo", index);
					await sel.chooseOrCreate(option);
					expect(await sel.value()).toContain(option);
				}
			}
		};

		const importColumns = [
			"editorDate",
			"editorFrom",
			"editorTo",
			"editorAmount",
			"editorMemo",
		];

		await importFile("bank_statement_a.csv");
		await waitLoading(page);
		expect(await retrieveRowsData(page, importColumns)).toEqual([
			   "date: 2015-02-01 (bg---800) | from: Banco Moneeey (bg---800) | to: To (bg---800 bg-green-900) | amount: 100,1 (bg---800) | memo: 2015-02-01;Auto Posto Aurora;-100.10 (bg---800)",
			   "date: 2015-02-01 (bg---600) | from: Banco Moneeey (bg---600) | to: To (bg---600 bg-green-950) | amount: 20,2 (bg---600) | memo: 2015-02-01;Padaria;-20.20 (bg---600)",
			   "date: 2015-02-03 (bg---800) | from: Banco Moneeey (bg---800) | to: To (bg---800 bg-green-900) | amount: 30,3 (bg---800) | memo: 2015-02-03;Restaurante Sorocaba;-30.30 (bg---800)",
			   "date: 2015-02-04 (bg---600) | from: Banco Moneeey (bg---600) | to: To (bg---600 bg-green-950) | amount: 40,4 (bg---600) | memo: 2015-02-04;Lava Jato - Carros;-40.40 (bg---600)",
			   "date: 2015-02-06 (bg---800) | from: Banco Moneeey (bg---800) | to: To (bg---800 bg-green-900) | amount: 57,52 (bg---800) | memo: 2015-02-06;Gas Station;-57.52 (bg---800)",
			   "date: 2015-02-07 (bg---600) | from: Banco Moneeey (bg---600) | to: To (bg---600 bg-green-950) | amount: 50,5 (bg---600) | memo: 2015-02-07;Transfer;-50.50 (bg---600)",
		]);

		await updateEditorTos([
			"Gas",
			"Bakery",
			"Restaurant",
			"Car Wash",
			"Gas",
			"MoneeeyCard",
		]);

		expect(await retrieveRowsData(page, ['editorTo'])).toEqual([
			   "to: Gas (bg---800)",
			   "to: Bakery (bg---600)",
			   "to: Restaurant (bg---800)",
			   "to: Car Wash (bg---600)",
			   "to: Gas (bg---800)",
			   "to: MoneeeyCard (bg---600)",
		]);
		await page.getByTestId("primary-button").click();

		const targetAccountSelect = Select(page, "target_account");
		expect(await targetAccountSelect.options()).toEqual([
			"Banco Moneeey",
			"MoneeeyCard",
			"Bitcoinss",
		]);
		await targetAccountSelect.choose("MoneeeyCard");
		await importFile("bank_statement_b.ofx");
		await waitLoading(page);

		expect(await retrieveRowsData(page, importColumns)).toEqual([
			"date: 2015-02-07 (bg---800 bg-cyan-900) | from: Banco Moneeey (bg---800 bg-cyan-900) | to: MoneeeyCard (bg---800 bg-cyan-900) | amount: 50,5 (bg---800 bg-cyan-900) | memo: 2015-02-07;Transfer;-50.50;50.50  FromMyOtherAccount Transfer from savings  2015-02-07 (bg---800 bg-fuchsia-900)",
			"date: 2015-02-10 (bg---600) | from: MoneeeyCard (bg---600) | to: To (bg---600 bg-green-950) | amount: 60,6 (bg---600) | memo: -60.60  Drogaria Drogas 420 Pharmacy purchase  2015-02-10 (bg---600)",
			"date: 2015-02-10 (bg---800) | from: MoneeeyCard (bg---800) | to: Restaurant (bg---800) | amount: 70,7 (bg---800) | memo: -70.70  Restaurante Monteiro Dining out  2015-02-10 (bg---800)",
			"date: 2015-02-11 (bg---600) | from: MoneeeyCard (bg---600) | to: To (bg---600 bg-green-950) | amount: 80,8 (bg---600) | memo: -80.80  Mercado Bom Preco Grocery shopping  2015-02-11 (bg---600)",
			"date: 2015-02-17 (bg---800) | from: MoneeeyCard (bg---800) | to: Car Wash (bg---800) | amount: 90,9 (bg---800) | memo: -90.90  Lava Jato Eco Car wash  2015-02-17 (bg---800)",
		]);
		await updateEditorTos([null, "Pharmacy", null, "Groceries", null]);
		expect(await retrieveRowsData(page, ['editorTo'])).toEqual([
			   "to: MoneeeyCard (bg---800 bg-cyan-900)",
			   "to: Pharmacy (bg---600)",
			   "to: Restaurant (bg---800)",
			   "to: Groceries (bg---600)",
			   "to: Car Wash (bg---800)",
		]);

		await page.getByTestId("primary-button").click();

		await OpenMenuItem(page, "All transactions");
		const allTransactionsColumns = [
			"editorDate",
			"editorFrom",
			"editorTo",
			"editorAmount",
			"editorMemo",
		];
		const today = formatDate(new Date());
		expect(await retrieveRowsData(page, allTransactionsColumns)).toEqual([
			   "date: 2015-02-01 (bg---800) | from: Banco Moneeey (bg---800) | to: Gas (bg---800) | amount: 100,1 (bg---800) | memo: 2015-02-01;Auto Posto Aurora;-100.10 (bg---800)",
			   "date: 2015-02-01 (bg---600) | from: Banco Moneeey (bg---600) | to: Bakery (bg---600) | amount: 20,2 (bg---600) | memo: 2015-02-01;Padaria;-20.20 (bg---600)",
			   "date: 2015-02-03 (bg---800) | from: Banco Moneeey (bg---800) | to: Restaurant (bg---800) | amount: 30,3 (bg---800) | memo: 2015-02-03;Restaurante Sorocaba;-30.30 (bg---800)",
			   "date: 2015-02-04 (bg---600) | from: Banco Moneeey (bg---600) | to: Car Wash (bg---600) | amount: 40,4 (bg---600) | memo: 2015-02-04;Lava Jato - Carros;-40.40 (bg---600)",
			   "date: 2015-02-06 (bg---800) | from: Banco Moneeey (bg---800) | to: Gas (bg---800) | amount: 57,52 (bg---800) | memo: 2015-02-06;Gas Station;-57.52 (bg---800)",
			   "date: 2015-02-07 (bg---600) | from: Banco Moneeey (bg---600) | to: MoneeeyCard (bg---600) | amount: 50,5 (bg---600) | memo: 2015-02-07;Transfer;-50.50;50.50  FromMyOtherAccount Transfer from savings  2015-02-07 (bg---600)",
			   "date: 2015-02-10 (bg---800) | from: MoneeeyCard (bg---800) | to: Pharmacy (bg---800) | amount: 60,6 (bg---800) | memo: -60.60  Drogaria Drogas 420 Pharmacy purchase  2015-02-10 (bg---800)",
			   "date: 2015-02-10 (bg---600) | from: MoneeeyCard (bg---600) | to: Restaurant (bg---600) | amount: 70,7 (bg---600) | memo: -70.70  Restaurante Monteiro Dining out  2015-02-10 (bg---600)",
			   "date: 2015-02-11 (bg---800) | from: MoneeeyCard (bg---800) | to: Groceries (bg---800) | amount: 80,8 (bg---800) | memo: -80.80  Mercado Bom Preco Grocery shopping  2015-02-11 (bg---800)",
			   "date: 2015-02-17 (bg---600) | from: MoneeeyCard (bg---600) | to: Car Wash (bg---600) | amount: 90,9 (bg---600) | memo: -90.90  Lava Jato Eco Car wash  2015-02-17 (bg---600)",
			   `date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			   `date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			   `date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
			   `date: ${today} (bg---600) | from: From (bg---600) | to: To (bg---600) | amount: 0 (bg---600) | memo:  (bg---600)`,
		]);
	});
});
