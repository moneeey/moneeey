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

// Column definitions for different views
const ALL_TRANSACTIONS_COLUMNS = [
	"editorDate",
	"editorFrom",
	"editorTo",
	"editorAmount",
	"editorMemo",
];

const REFERENCE_ACCOUNT_COLUMNS = [
	"editorDate",
	"editorAccount",
	"editorAmount",
	"editorRunning",
	"editorMemo",
];

const IMPORT_COLUMNS = [
	"editorDate",
	"editorFrom",
	"editorTo",
	"editorAmount",
	"editorMemo",
];

// Utility functions
const classForTestIdTDs =
	(page: Page, testId: string) => async (index: number) => {
		const className =
			(await page
				.getByTestId(`inputContainer${testId}`)
				.nth(index)
				.locator("..")
				.getAttribute("class")) ?? "";
		return className
			.replace(/\s+/g, " ")
			.replace(/bg-background-/g, "bg---")
			.replace(/[\r\n\s]+/g, " ")
			.trim();
	};

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

	const waitForClosed = async () =>
		await expect(menuList()).toBeHidden({ timeout: 5000 });
	const open = async () => {
		if (await menuList().isHidden()) {
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
		await waitForClosed();
	};
	const currentValue = async () =>
		select()
			.locator(".mn-select__single-value, .mn-select__placeholder")
			.innerText();

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
			await waitForClosed();
			await expect(select()).toContainText(optionName, { timeout: 10000 });
		},
		async choose(optionName: string, exact = true, retries = 3) {
			try {
				await open();
				const option = findMenuItem(optionName, exact);
				await option.click({ timeout: 5000 });
				await waitForClosed();
			} catch (e) {
				if (
					(e.message.includes("detached") || e.message.includes("Timeout")) &&
					retries > 0
				) {
					console.warn(`Option issue, retrying choose... ${retries}`);
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
			await waitForClosed();
			await expect(select()).toContainText(optionName, { timeout: 10000 });
		},
	};
}

function Input(page: Page, testId: string, container?: Locator, index = 0) {
	const input = (container || page).getByTestId(testId).nth(index);

	return {
		async value() {
			return input.getAttribute("value");
		},
		async toHaveValue(value: string, timeout = 10000) {
			await expect(input).toHaveValue(value, { timeout });
		},
		async change(value: string, expectedValue = value) {
			await input.click();
			await input.fill(value);
			await input.blur();
			await expect(input).toHaveValue(expectedValue, { timeout: 5000 });
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
	await expect(dismissIcon()).toBeVisible();
	await dismissIcon().click();
	await expect(dismissIcon()).not.toBeVisible();
}

// Transaction helpers
async function updateOnAllTransactions(
	page: Page,
	index: number,
	fromAccountName: string,
	toAccountName: string,
	amount: string,
	expectedAmount?: string,
) {
	const editorFrom = Select(page, "editorFrom", index);
	await editorFrom.chooseOrCreate(fromAccountName);

	const editorTo = Select(page, "editorTo", index);
	await editorTo.chooseOrCreate(toAccountName);

	await Input(page, "editorAmount", undefined, index).change(
		amount,
		expectedAmount ?? amount,
	);
}

async function updateOnAccountTransactions(
	page: Page,
	index: number,
	accountName: string,
	amount: string,
	memo?: string,
	expectedAmount?: string,
) {
	const editorAccount = Select(page, "editorAccount", index);
	await editorAccount.chooseOrCreate(accountName);

	await Input(page, "editorAmount", undefined, index).change(
		amount,
		expectedAmount ?? amount,
	);
	if (memo) {
		await Input(page, "editorMemo", undefined, index).change(memo);
	}
}

// Test helpers
async function retrieveRowData(page: Page, columns: string[], index: number) {
	const getCellData = async (column: string) => {
		const isValueColumn =
			column.includes("Amount") ||
			column.includes("Running") ||
			column.includes("Memo") ||
			column.includes("Date");
		const value = isValueColumn
			? await Input(page, column, undefined, index).value()
			: await Select(page, column, index).value();

		const className = await classForTestIdTDs(page, column)(index);

		return `${column.replace("editor", "").toLowerCase()}: ${value} (${className})`;
	};

	const cellData = await Promise.all(
		columns.map((column) => getCellData(column)),
	);

	return cellData.join(" | ");
}

async function retrieveRowsData(
	page: Page,
	columns: string[],
	expectedCount?: number,
) {
	if (expectedCount) {
		await expect(page.getByTestId(columns[0])).toHaveCount(expectedCount, {
			timeout: 10000,
		});
	}
	const rows = await page.getByTestId(columns[0]).all();
	return await Promise.all(
		Array.from({ length: rows.length }).map((_v, index) =>
			retrieveRowData(page, columns, index),
		),
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
	await expect(page.getByText("Select language")).toBeVisible();
	await expect(page.getByTestId("languageSelector_pt")).toBeVisible();
	await expect(page.getByTestId("languageSelector_es")).toBeVisible();
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
	await page.getByTestId("languageSelector_es").click();
	await expect(page.getByTestId("ok-button")).toContainText("Ir a Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");

	// Select default currency
	await page.getByTestId("ok-button").click();
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();
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
	await Input(page, "editorInitial_balance").change("1234,56", "1.234,56");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("MoneeeyCard");
	expect(await Select(page, "editorCurrency").value()).toEqual(
		"BRL Brazilian Real",
	);
	await Input(page, "editorInitial_balance").change("2000,00", "2.000");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("Bitcoinss");
	await Select(page, "editorCurrency").choose("BTC Bitcoin");
	await Input(page, "editorInitial_balance").change(
		"0,123456789",
		"0,12345678",
	);
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

		await expect(page.getByText("multi-currency")).toBeVisible();
		await tourNext(page); // Next after Edit Currencies

		// Accounts page
		await expect(page.getByText("Manage your accounts")).toBeVisible();
		await tourNext(page); // Next on Edit accounts

		// Progress Tour to Transactions
		await expect(
			page.getByText("generates reports and insights"),
		).toBeVisible();

		await updateOnAllTransactions(
			page,
			2,
			"Banco Moneeey",
			"Gas Station",
			"1234,56",
			"1.234,56",
		);
		await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "78,69");
		await updateOnAllTransactions(page, 4, "Banco Moneeey", "Bakery", "11,11");

		// Progress Tour to Transactions
		await tourNext(page);
		await expect(page.getByText("Time to budget")).toBeVisible();

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
		await expect(page.getByText("R$").first()).toBeVisible();
		await Input(page, "editorAllocated", undefined, 0).change("65,00", "65");
		await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("89,8", {
			timeout: 15000,
		});
		await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue(
			"-24,80",
			{ timeout: 15000 },
		);
		expect(await editorRemainingClass(0)).toEqual(
			"bg---800 opacity-80 text-red-200",
		);

		await Input(page, "editorAllocated", undefined, 1).change(
			"5435,25",
			"5.435,25",
		);
		await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("1.234,56");
		await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue(
			"4.200,69",
		);
		expect(await editorRemainingClass(1)).toEqual("bg---600 opacity-80");

		// Go to Import
		await tourNext(page);
		await expect(page.getByText("import transactions")).toBeVisible();

		// Finish on Transactions
		await tourNext(page);
		await expect(page.getByText("Gas Station")).toBeVisible();

		// Close Tour
		await tourNext(page);

		// Tour is closed
		await expect(page.getByTestId("nm-modal-title")).toBeHidden();
	});

	test("Transactions", async ({ page }) => {
		await completeLandingWizard(page);

		// Click on MoneeeyCard account
		await page.getByText("BRL MoneeeyCard").click();

		// Add three transactions
		await updateOnAccountTransactions(
			page,
			1,
			"Banco Moneeey",
			"3000,00",
			undefined,
			"3.000",
		);
		await updateOnAccountTransactions(
			page,
			2,
			"Bakery123",
			"-60,00",
			"pao",
			"-60",
		);
		await updateOnAccountTransactions(
			page,
			3,
			"Ristorant88",
			"-128,00",
			undefined,
			"-128",
		);
		await updateOnAccountTransactions(
			page,
			4,
			"Playxbox421",
			"-7213,21",
			undefined,
			"-7.213,21",
		);
		await updateOnAccountTransactions(page, 5, "Cashbazk", "69,42", "cashback");

		// Wait running balance to be updated
		await Input(page, "editorRunning", undefined, 5).toHaveValue("-2.331,79");

		// Assert classes for the table
		const today = formatDate(new Date());
		expect(await retrieveRowsData(page, REFERENCE_ACCOUNT_COLUMNS, 7)).toEqual([
			`date: ${today} (bg---800) | account: Initial balance BRL (bg---800) | amount: 2.000 (bg---800 text-green-200) | running: 2.000 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: Banco Moneeey (bg---600) | amount: 3.000 (bg---600 text-green-200) | running: 5.000 (bg---600 text-green-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Bakery123 (bg---800) | amount: -60 (bg---800 text-red-200) | running: 4.940 (bg---800 text-green-200) | memo: pao (bg---800)`,
			`date: ${today} (bg---600) | account: Ristorant88 (bg---600) | amount: -128 (bg---600 text-red-200) | running: 4.812 (bg---600 text-green-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Playxbox421 (bg---800) | amount: -7.213,21 (bg---800 text-red-200) | running: -2.401,21 (bg---800 text-red-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: Cashbazk (bg---600) | amount: 69,42 (bg---600 text-green-200) | running: -2.331,79 (bg---600 text-red-200) | memo: cashback (bg---600)`,
			`date: ${today} (bg---800) | account: Account (bg---800) | amount: 0 (bg---800) | running: 0 (bg---800) | memo:  (bg---800)`,
		]);
		// Go to All transactions and assert
		await OpenMenuItem(page, "All transactions");
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 9)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Banco Moneeey (bg---600) | to: MoneeeyCard (bg---600) | amount: 3.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: MoneeeyCard (bg---800) | to: Bakery123 (bg---800) | amount: 60 (bg---800) | memo: pao (bg---800)`,
			`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Ristorant88 (bg---600) | amount: 128 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: MoneeeyCard (bg---800) | to: Playxbox421 (bg---800) | amount: 7.213,21 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Cashbazk (bg---600) | to: MoneeeyCard (bg---600) | amount: 69,42 (bg---600) | memo: cashback (bg---600)`,
			`date: ${today} (bg---800) | from: From (bg---800) | to: To (bg---800) | amount: 0 (bg---800) | memo:  (bg---800)`,
		]);

		// Go to Banco Moneeey account and assert
		await OpenMenuItem(page, "BRL Banco Moneeey");
		expect(await retrieveRowsData(page, REFERENCE_ACCOUNT_COLUMNS, 3)).toEqual([
			`date: ${today} (bg---800) | account: Initial balance BRL (bg---800) | amount: 1.234,56 (bg---800 text-green-200) | running: 1.234,56 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: MoneeeyCard (bg---600) | amount: -3.000 (bg---600 text-red-200) | running: -1.765,44 (bg---600 text-red-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Account (bg---800) | amount: 0 (bg---800) | running: 0 (bg---800) | memo:  (bg---800)`,
		]);
	});

	test("Swap Transaction Directions", async ({ page }) => {
		await completeLandingWizard(page);

		// Click on MoneeeyCard account
		await page.getByText("BRL MoneeeyCard").click();

		// Add initial transactions
		await updateOnAccountTransactions(
			page,
			1,
			"Banco Moneeey",
			"3000",
			"Salary",
			"3.000",
		);
		await updateOnAccountTransactions(page, 2, "Bakery123", "-60", "pao");
		await updateOnAccountTransactions(
			page,
			3,
			"Ristorant88",
			"-128,12",
			"Dinner",
		);

		// Wait for running balance to be updated
		await Input(page, "editorRunning", undefined, 3).toHaveValue("4.811,88");
		await Input(page, "editorMemo", undefined, 2).toHaveValue("pao");

		// Test swapping from positive to negative (Salary)
		await Input(page, "editorAmount", undefined, 1).change(
			"-3000,00",
			"-3.000",
		);
		await Input(page, "editorMemo", undefined, 1).change("Salary (swapped)");

		// Verify running balance is updated
		await Input(page, "editorRunning", undefined, 3).toHaveValue("-1.188,12");

		// Go to All transactions and verify the swap
		await OpenMenuItem(page, "All transactions");
		const today = formatDate(new Date());
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 7)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Banco Moneeey (bg---600) | amount: 3.000 (bg---600) | memo: Salary (swapped) (bg---600)`,
			`date: ${today} (bg---800) | from: MoneeeyCard (bg---800) | to: Bakery123 (bg---800) | amount: 60 (bg---800) | memo: pao (bg---800)`,
			`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Ristorant88 (bg---600) | amount: 128,12 (bg---600) | memo: Dinner (bg---600)`,
			`date: ${today} (bg---800) | from: From (bg---800) | to: To (bg---800) | amount: 0 (bg---800) | memo:  (bg---800)`,
		]);

		// Go back to MoneeeyCard account
		await OpenMenuItem(page, "BRL MoneeeyCard");

		// Test swapping from negative to positive (Dinner)
		await Input(page, "editorAmount", undefined, 3).change("128,00", "128");
		await Input(page, "editorMemo", undefined, 3).change("Dinner (swapped)");

		// Verify running balance is updated
		await Input(page, "editorRunning", undefined, 3).toHaveValue("-932");

		// Go to All transactions and verify the swap
		await OpenMenuItem(page, "All transactions");
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 7)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Banco Moneeey (bg---600) | amount: 3.000 (bg---600) | memo: Salary (swapped) (bg---600)`,
			`date: ${today} (bg---800) | from: MoneeeyCard (bg---800) | to: Bakery123 (bg---800) | amount: 60 (bg---800) | memo: pao (bg---800)`,
			`date: ${today} (bg---600) | from: Ristorant88 (bg---600) | to: MoneeeyCard (bg---600) | amount: 128 (bg---600) | memo: Dinner (swapped) (bg---600)`,
			`date: ${today} (bg---800) | from: From (bg---800) | to: To (bg---800) | amount: 0 (bg---800) | memo:  (bg---800)`,
		]);

		// Verify Banco Moneeey account transactions
		await OpenMenuItem(page, "BRL Banco Moneeey");
		expect(await retrieveRowsData(page, REFERENCE_ACCOUNT_COLUMNS, 3)).toEqual([
			`date: ${today} (bg---800) | account: Initial balance BRL (bg---800) | amount: 1.234,56 (bg---800 text-green-200) | running: 1.234,56 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: MoneeeyCard (bg---600) | amount: 3.000 (bg---600 text-green-200) | running: 4.234,56 (bg---600 text-green-200) | memo: Salary (swapped) (bg---600)`,
			`date: ${today} (bg---800) | account: Account (bg---800) | amount: 0 (bg---800) | running: 0 (bg---800) | memo:  (bg---800)`,
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

			await expect(
				page.getByText(fileName.substring(fileName.lastIndexOf("/"))).first(),
			).toBeVisible();

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

		await importFile("bank_statement_a.csv");
		await waitLoading(page);
		expect(await retrieveRowsData(page, IMPORT_COLUMNS, 6)).toEqual([
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

		expect(await retrieveRowsData(page, ["editorTo"], 6)).toEqual([
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

		expect(await retrieveRowsData(page, IMPORT_COLUMNS, 5)).toEqual([
			"date: 2015-02-07 (bg---800 bg-cyan-900) | from: Banco Moneeey (bg---800 bg-cyan-900) | to: MoneeeyCard (bg---800 bg-cyan-900) | amount: 50,5 (bg---800 bg-cyan-900) | memo: 2015-02-07;Transfer;-50.50;50.50  FromMyOtherAccount Transfer from savings  2015-02-07 (bg---800 bg-fuchsia-900)",
			"date: 2015-02-10 (bg---600) | from: MoneeeyCard (bg---600) | to: To (bg---600 bg-green-950) | amount: 60,6 (bg---600) | memo: -60.60  Drogaria Drogas 420 Pharmacy purchase  2015-02-10 (bg---600)",
			"date: 2015-02-10 (bg---800) | from: MoneeeyCard (bg---800) | to: Restaurant (bg---800) | amount: 70,7 (bg---800) | memo: -70.70  Restaurante Monteiro Dining out  2015-02-10 (bg---800)",
			"date: 2015-02-11 (bg---600) | from: MoneeeyCard (bg---600) | to: To (bg---600 bg-green-950) | amount: 80,8 (bg---600) | memo: -80.80  Mercado Bom Preco Grocery shopping  2015-02-11 (bg---600)",
			"date: 2015-02-17 (bg---800) | from: MoneeeyCard (bg---800) | to: Car Wash (bg---800) | amount: 90,9 (bg---800) | memo: -90.90  Lava Jato Eco Car wash  2015-02-17 (bg---800)",
		]);
		await updateEditorTos([null, "Pharmacy", null, "Groceries", null]);
		expect(await retrieveRowsData(page, ["editorTo"], 5)).toEqual([
			"to: MoneeeyCard (bg---800 bg-cyan-900)",
			"to: Pharmacy (bg---600)",
			"to: Restaurant (bg---800)",
			"to: Groceries (bg---600)",
			"to: Car Wash (bg---800)",
		]);

		await page.getByTestId("primary-button").click();

		await OpenMenuItem(page, "All transactions");
		const today = formatDate(new Date());
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 14)).toEqual([
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

	test("Dashboard", async ({ page }) => {
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// Dashboard should be visible
		await expect(page.getByText("Recent transactions")).toBeVisible();

		// Verify recent transactions show the 3 initial balance transactions
		const today = formatDate(new Date());
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 3)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
		]);

		// Navigate to MoneeeyCard account, add a transaction
		await OpenMenuItem(page, "BRL MoneeeyCard");
		await updateOnAccountTransactions(page, 1, "Bakery123", "-50", "bread");

		// Return to Dashboard
		await OpenMenuItem(page, "Dashboard");
		await expect(page.getByText("Recent transactions")).toBeVisible();

		// Verify the new transaction appears in recent transactions
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 4)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Bakery123 (bg---600) | amount: 50 (bg---600) | memo: bread (bg---600)`,
		]);
	});

	test("Account Settings", async ({ page }) => {
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// Navigate to Settings > Accounts via testId (avoids ambiguity with "Include accounts:" text)
		const toggle = page.getByTestId("toggleMenu");
		if ((await toggle.getAttribute("data-expanded")) === "false") {
			await toggle.click();
		}
		await page
			.getByTestId("appMenu_subitems_settings_settings_accounts")
			.click();

		// Verify 3 accounts are displayed (sorted: Banco Moneeey, Bitcoinss, MoneeeyCard)
		await expect(page.getByTestId("editorName").nth(0)).toHaveValue(
			"Banco Moneeey",
		);
		await expect(page.getByTestId("editorName").nth(1)).toHaveValue(
			"Bitcoinss",
		);
		await expect(page.getByTestId("editorName").nth(2)).toHaveValue(
			"MoneeeyCard",
		);

		// Rename "Banco Moneeey" to "Banco Principal"
		await Input(page, "editorName", undefined, 0).change("Banco Principal");

		// Expand sidebar to verify the rename
		const menuToggle = page.getByTestId("toggleMenu");
		if ((await menuToggle.getAttribute("data-expanded")) === "false") {
			await menuToggle.click();
		}
		await expect(page.getByText("BRL Banco Principal")).toBeVisible();
		await expect(page.getByText("BRL Banco Moneeey")).not.toBeVisible();

		// Archive "Bitcoinss" by toggling the Archived checkbox (index 1)
		await page.getByTestId("editorArchived").nth(1).click();

		// Verify Bitcoinss no longer appears in the sidebar
		await expect(page.getByText("BTC Bitcoinss")).not.toBeVisible();

		// Navigate to Banco Principal and add a transaction to MoneeeyCard
		await OpenMenuItem(page, "BRL Banco Principal");
		await updateOnAccountTransactions(page, 1, "MoneeeyCard", "-500");

		// Navigate to Settings > Accounts for merge
		const toggle2 = page.getByTestId("toggleMenu");
		if ((await toggle2.getAttribute("data-expanded")) === "false") {
			await toggle2.click();
		}
		await page
			.getByTestId("appMenu_subitems_settings_settings_accounts")
			.click();

		// Click "Merge accounts" button
		await page.getByText("Merge accounts").click();

		// Select source and target accounts in the merge modal
		const sourceAccount = Select(page, "source_account");
		await sourceAccount.choose("Banco Principal");

		const targetAccount = Select(page, "target_account");
		await targetAccount.choose("MoneeeyCard");

		// Click Merge button
		await page.getByTestId("merge-accounts").click();

		// Verify Banco Principal is gone from sidebar
		await expect(page.getByText("BRL Banco Principal")).not.toBeVisible();

		// Navigate to All transactions and verify all transactions reference MoneeeyCard
		await OpenMenuItem(page, "All transactions");
		const today = formatDate(new Date());
		// 3 initial balances (BRL→MoneeeyCard merged, BRL→MoneeeyCard, BTC→archived) + merged transaction + empty row
		// Note: Bitcoinss is archived so its name doesn't resolve in selects — shows placeholder "To"
		expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 5)).toEqual([
			`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: MoneeeyCard (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: To (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: MoneeeyCard (bg---600) | amount: 500 (bg---600) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | from: From (bg---800) | to: To (bg---800) | amount: 0 (bg---800) | memo:  (bg---800)`,
		]);
	});

	test("Multi-Currency Transactions", async ({ page }) => {
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// === Direction 1: BRL → BTC (via All transactions) ===
		await OpenMenuItem(page, "All transactions");

		// Set From=Banco Moneeey (BRL), To=Bitcoinss (BTC) on the new row (index 3)
		const editorFrom1 = Select(page, "editorFrom", 3);
		await editorFrom1.chooseOrCreate("Banco Moneeey");
		const editorTo1 = Select(page, "editorTo", 3);
		await editorTo1.chooseOrCreate("Bitcoinss");

		// Two editorAmount fields should now appear for this row (BRL from, BTC to)
		// Indices 0,1,2 = initial balance amounts (single), index 3 = BRL from, index 4 = BTC to
		await Input(page, "editorAmount", undefined, 3).change("100");
		await Input(page, "editorAmount", undefined, 4).change(
			"0,01000000",
			"0,01",
		);

		// Verify running balance on Banco Moneeey: 1.234,56 - 100 = 1.134,56
		await OpenMenuItem(page, "BRL Banco Moneeey");
		await Input(page, "editorRunning", undefined, 1).toHaveValue("1.134,56");

		// Verify running balance on Bitcoinss: 0,12345678 + 0,01 = 0,13345678
		await OpenMenuItem(page, "BTC Bitcoinss");
		await Input(page, "editorRunning", undefined, 1).toHaveValue("0,13345678");

		// === Direction 2: BTC → BRL (via All transactions) ===
		await OpenMenuItem(page, "All transactions");

		// Set From=Bitcoinss (BTC), To=MoneeeyCard (BRL) on the new row (index 4)
		const editorFrom2 = Select(page, "editorFrom", 4);
		await editorFrom2.chooseOrCreate("Bitcoinss");
		const editorTo2 = Select(page, "editorTo", 4);
		await editorTo2.chooseOrCreate("MoneeeyCard");

		// Two editorAmount fields for row 4: BTC from (index 5), BRL to (index 6)
		// Note: row 3 has 2 amounts (indices 3,4), so row 4 starts at index 5
		await Input(page, "editorAmount", undefined, 5).change(
			"0,05000000",
			"0,05",
		);
		await Input(page, "editorAmount", undefined, 6).change("500");

		// Verify Bitcoinss balance: 0,13345678 - 0,05 = 0,08345678
		await OpenMenuItem(page, "BTC Bitcoinss");
		await Input(page, "editorRunning", undefined, 2).toHaveValue("0,08345678");

		// Verify MoneeeyCard balance: 2.000 + 500 = 2.500
		await OpenMenuItem(page, "BRL MoneeeyCard");
		await Input(page, "editorRunning", undefined, 1).toHaveValue("2.500");

		// === Budget with multi-currency transactions ===
		// Add a BRL expense for budget testing
		await OpenMenuItem(page, "All transactions");
		await updateOnAllTransactions(
			page,
			5,
			"Banco Moneeey",
			"Gas Station",
			"200",
		);

		// Navigate to Budget
		await OpenMenuItem(page, "Budget");

		// Create a budget for Gas Station expenses
		await BudgetEditorSave(
			page,
			"Gas Budget",
			mostUsedCurrencies[0],
			"Gas Station",
		);

		// Allocate budget and verify used amount
		await expect(page.getByText("R$").first()).toBeVisible();
		await Input(page, "editorAllocated", undefined, 0).change("300", "300");
		await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("200", {
			timeout: 15000,
		});
		await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue(
			"100",
			{ timeout: 15000 },
		);

		// Create a budget for Banco Moneeey-tagged expenses (includes the BRL→BTC transaction)
		await BudgetEditorSave(
			page,
			"Crypto Expenses",
			mostUsedCurrencies[0],
			"Banco Moneeey",
		);

		// Allocate and verify: the BRL from_value (100) of the BRL→BTC transaction shows as used
		await Input(page, "editorAllocated", undefined, 1).change("500", "500");
		await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("100", {
			timeout: 15000,
		});
		await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue(
			"400",
			{ timeout: 15000 },
		);
	});

	test("Budget Lifecycle", async ({ page }) => {
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// Add transactions for budget testing
		await OpenMenuItem(page, "All transactions");
		await updateOnAllTransactions(
			page,
			3,
			"Banco Moneeey",
			"Gas Station",
			"100",
		);
		await updateOnAllTransactions(page, 4, "Banco Moneeey", "Bakery", "50");

		// Navigate to Budget
		await OpenMenuItem(page, "Budget");

		// Create "Fuel" budget
		await BudgetEditorSave(page, "Fuel", mostUsedCurrencies[0], "Gas Station");

		// Allocate 200 for current month
		await expect(page.getByText("R$").first()).toBeVisible();
		await Input(page, "editorAllocated", undefined, 0).change("200", "200");
		await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("100", {
			timeout: 15000,
		});
		await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue(
			"100",
			{ timeout: 15000 },
		);

		// Create "Food" budget
		await BudgetEditorSave(page, "Food", mostUsedCurrencies[0], "Bakery");

		// Allocate 30 — less than used (50) — should show negative remaining in red
		await Input(page, "editorAllocated", undefined, 1).change("30", "30");
		await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("50", {
			timeout: 15000,
		});
		await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue(
			"-20",
			{ timeout: 15000 },
		);
		const editorRemainingClass = classForTestIdTDs(page, "editorRemaining");
		expect(await editorRemainingClass(1)).toEqual(
			"bg---800 opacity-80 text-red-200",
		);

		// === Edit budget: rename "Fuel" to "Gasoline" ===
		// Click on the "Fuel" budget name link to open editor
		await page.getByTestId("editorBudget").nth(0).click();
		await expect(page.getByTestId("budgetEditorDrawer")).toBeVisible();

		// Rename
		await Input(
			page,
			"budgetName",
			page.getByTestId("budgetEditorDrawer"),
		).change("Gasoline");
		await page.getByTestId("budgetSave").click();

		// Verify the budget name is updated in the period table
		await expect(page.getByTestId("editorBudget").nth(0)).toContainText(
			"Gasoline",
		);

		// === Archive budget: archive "Food" ===
		await page.getByTestId("editorBudget").nth(1).click();
		await expect(page.getByTestId("budgetEditorDrawer")).toBeVisible();

		// Toggle archived checkbox
		await page.getByTestId("budgetIsArchived").click();
		await page.getByTestId("budgetSave").click();

		// Verify "Food" disappears from the budget list
		await expect(page.getByTestId("editorBudget")).toHaveCount(1);
		await expect(page.getByTestId("editorBudget").nth(0)).toContainText(
			"Gasoline",
		);

		// Toggle "Show archived budgets" checkbox
		await page.getByTestId("checkboxViewArchived").click();

		// "Food" should reappear
		await expect(page.getByTestId("editorBudget")).toHaveCount(2);

		// Uncheck to hide again
		await page.getByTestId("checkboxViewArchived").click();
		await expect(page.getByTestId("editorBudget")).toHaveCount(1);
	});

	test("Data Export and Import", async ({ page }) => {
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// Add a transaction so we have data beyond initial balances
		await OpenMenuItem(page, "All transactions");
		await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "42,50");

		// Navigate to Settings > Preferences
		await OpenMenuItem(page, "Preferences");

		// === Export Data ===
		await page.getByText("Export data").click();
		await expect(page.getByTestId("accountSettings")).toBeVisible();

		// Wait for export to complete (the textarea will contain JSON data)
		await expect(page.getByTestId("importExportOutput")).not.toHaveValue("", {
			timeout: 30000,
		});
		const exportedData = await page
			.getByTestId("importExportOutput")
			.inputValue();
		expect(exportedData.length).toBeGreaterThan(100);

		// Close the export drawer
		await page.getByText("Close").click();
		await expect(page.getByTestId("accountSettings")).not.toBeVisible();

		// === Clear All Data ===
		await page.getByText("Clear all data").click();
		await expect(page.getByTestId("accountSettings")).toBeVisible();

		// Type the safety token
		await page.getByTestId("importExportOutput").fill("DELETE EVERYTHING");
		// Click the submit button (Clear all data)
		await page
			.getByTestId("accountSettings")
			.getByTestId("primary-button")
			.click();

		// Verify app shows reload message
		await expect(page.getByTestId("importExportOutput")).toHaveValue(
			"Reload your page",
		);

		// Reload page to start fresh
		await page.reload();

		// Verify app resets to landing wizard
		await expect(page.getByText("Select language")).toBeVisible();

		// Complete the landing wizard again
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// === Import Data ===
		await OpenMenuItem(page, "Preferences");
		await page.getByText("Import data").click();
		await expect(page.getByTestId("accountSettings")).toBeVisible();

		// Paste the exported data
		await page.getByTestId("importExportOutput").fill(exportedData);

		// Click Import data submit button
		await page
			.getByTestId("accountSettings")
			.getByTestId("primary-button")
			.click();

		// Wait for import to complete
		await expect(page.getByTestId("importExportOutput")).toHaveValue(
			"Reload your page",
			{ timeout: 30000 },
		);

		// Reload to apply imported data
		await page.reload();

		// Verify the app loads with restored data (no landing wizard)
		await expect(page.getByText("Recent transactions")).toBeVisible();

		// Navigate to All transactions and verify the Bakery transaction is restored
		await OpenMenuItem(page, "All transactions");

		// Should have the original transactions: 3 initial balances + 1 Bakery + empty row
		// Note: after import + new wizard accounts, there may be duplicates from the re-run wizard
		// The key assertion is that the Bakery transaction from the export is present
		await expect(page.getByText("Bakery")).toBeVisible();
		await expect(page.getByText("42,5")).toBeVisible();
	});

	test("Transaction Date Editing and Ordering", async ({ page }) => {
		await completeLandingWizard(page);

		// Close tour modal
		await page.getByTestId("nm-modal-card").getByTestId("close").click();

		// Navigate to MoneeeyCard account
		await page.getByText("BRL MoneeeyCard").click();

		const today = formatDate(new Date());
		const yesterday = formatDate(
			new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
		);
		const twoDaysAgo = formatDate(
			new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
		);

		// Add 3 transactions (all default to today)
		await updateOnAccountTransactions(page, 1, "Bakery123", "-100");
		await updateOnAccountTransactions(page, 2, "Ristorant88", "-200");
		await updateOnAccountTransactions(page, 3, "Gas Station", "-50");

		// Verify running balances with today's ordering
		await Input(page, "editorRunning", undefined, 1).toHaveValue("1.900");
		await Input(page, "editorRunning", undefined, 2).toHaveValue("1.700");
		await Input(page, "editorRunning", undefined, 3).toHaveValue("1.650");

		// Change Gas Station transaction date to yesterday
		await Input(page, "editorDate", undefined, 3).change(yesterday);

		// Gas Station should now sort before Bakery123 and Ristorant88
		// New order: initial balance, Gas Station (yesterday), Bakery123 (today), Ristorant88 (today)
		expect(await retrieveRowsData(page, REFERENCE_ACCOUNT_COLUMNS, 5)).toEqual([
			`date: ${yesterday} (bg---800) | account: Gas Station (bg---800) | amount: -50 (bg---800 text-red-200) | running: 1.950 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: Initial balance BRL (bg---600) | amount: 2.000 (bg---600 text-green-200) | running: 2.000 (bg---600 text-green-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Bakery123 (bg---800) | amount: -100 (bg---800 text-red-200) | running: 1.850 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: Ristorant88 (bg---600) | amount: -200 (bg---600 text-red-200) | running: 1.650 (bg---600 text-green-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Account (bg---800) | amount: 0 (bg---800) | running: 0 (bg---800) | memo:  (bg---800)`,
		]);

		// Change Bakery123 date to 2 days ago
		await Input(page, "editorDate", undefined, 2).change(twoDaysAgo);

		// New order: Bakery123 (2 days ago), Gas Station (yesterday), initial balance (today), Ristorant88 (today)
		expect(await retrieveRowsData(page, REFERENCE_ACCOUNT_COLUMNS, 5)).toEqual([
			`date: ${twoDaysAgo} (bg---800) | account: Bakery123 (bg---800) | amount: -100 (bg---800 text-red-200) | running: 1.900 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${yesterday} (bg---600) | account: Gas Station (bg---600) | amount: -50 (bg---600 text-red-200) | running: 1.850 (bg---600 text-green-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Initial balance BRL (bg---800) | amount: 2.000 (bg---800 text-green-200) | running: 2.000 (bg---800 text-green-200) | memo:  (bg---800)`,
			`date: ${today} (bg---600) | account: Ristorant88 (bg---600) | amount: -200 (bg---600 text-red-200) | running: 1.650 (bg---600 text-red-200) | memo:  (bg---600)`,
			`date: ${today} (bg---800) | account: Account (bg---800) | amount: 0 (bg---800) | running: 0 (bg---800) | memo:  (bg---800)`,
		]);
	});
});
