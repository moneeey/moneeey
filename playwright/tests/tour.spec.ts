import { type Locator, type Page, expect, test } from "@playwright/test";

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

function Select(page: Page, testId: string, index = 0) {
	const select = page.getByTestId(testId).nth(index);
	const input = select.locator(".mn-select__input");
	const menuList = page.locator(".mn-select__menu-list");

	const isClosed = async () => await menuList.isHidden();
	const open = async () => {
		if (await isClosed()) {
			await select.click();
		}
	};

	const listOptions = async () =>
		await menuList.locator(".mn-select__option").allTextContents();
	const findMenuItem = (optionName: string, exact = true) =>
		menuList.getByText(optionName, { exact });
	const createNew = async (optionName: string) => {
		await input.fill(optionName);
		await input.press("Enter");
	};

	return {
		async value() {
			return select.locator(".mn-select__single-value").innerText();
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
		async choose(optionName: string, exact = true) {
			await open();
			const option = findMenuItem(optionName, exact);
			await option.click();
			await isClosed();
		},
		async chooseOrCreate(optionName: string) {
			await open();
			const option = findMenuItem(optionName, false);
			if ((await option.count()) > 0) {
				await option.click();
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
		async change(value: string) {
			await input.click();
			await input.fill(value);
			await input.blur();
		},
	};
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
	]);
	await budgetTags.choose(tag, false);

	await budgetEditor.getByTestId("budgetSave").click();
}

async function dismissNotification(page: Page, text: string) {
	await expect(page.getByText(text)).toContainText(text);
	const dismissIcon = () => page.getByTestId("mn-dismiss-status");
	expect(dismissIcon()).toBeVisible();
	await dismissIcon().click();
	expect(dismissIcon()).not.toBeVisible();
}

function tourNext(page: Page) {
	return page.getByTestId("nm-modal-card").getByTestId("next").click(); // Start Tour
}

async function completeLandingWizard(page: Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	// Select language
	expect(page.getByText("Select language")).toBeDefined();
	expect(page.getByTestId("languageSelector_portuguese")).toBeDefined();
	expect(page.getByTestId("languageSelector_spanish")).toBeDefined();
	expect(page.getByTestId("languageSelector_english")).toBeDefined();
	await page.getByTestId("languageSelector_spanish").click();
	await expect(page.getByTestId("ok-button")).toContainText("Continuar");
	await page.getByTestId("languageSelector_english").click();
	await expect(page.getByTestId("ok-button")).toContainText("Continue");

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

	await Input(page, "name").change("Bitcoinss");
	await Select(page, "editorCurrency").choose("BTC Bitcoin");
	await Input(page, "editorInitial_balance").change("0,123456789");
	expect(await Select(page, "editorCurrency").value()).toEqual("BTC Bitcoin");
	await page.getByTestId("save-and-close").click();

	await expect(page.getByText("Dashboard")).toBeVisible();
}

async function insertTransaction(
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

test.describe("Tour", () => {
	test("Moneeey Tour", async ({ page }) => {
		await completeLandingWizard(page);

		await page.getByTestId("start-tour").click(); // Start Tour

		expect(page.getByText("please edit the currencies")).toBeDefined();
		await tourNext(page); // Next after Edit Currencies

		// Accounts page
		expect(page.getByText("Now that we know the currencies")).toBeDefined();
		await tourNext(page); // Next on Edit accounts

		// Progress Tour to Transactions
		expect(page.getByText("start inserting transactions")).toBeDefined();

		await insertTransaction(page, 2, "Banco Moneeey", "Gas Station", "1234,56");
		await insertTransaction(page, 3, "Banco Moneeey", "Bakery", "78,69");
		await insertTransaction(page, 4, "Banco Moneeey", "Bakery", "11,11");

		// Progress Tour to Transactions
		await tourNext(page);
		expect(page.getByText("time to budget")).toBeDefined();

		// Cant progress because must create budget
		await tourNext(page);
		await dismissNotification(
			page,
			"Before continuing, please click on 'New Budget' and create a budget",
		);

		// Create budgets
		await BudgetEditorSave(page, "Gas", mostUsedCurrencies[0], "Gas Station");
		await BudgetEditorSave(page, "Bakery", mostUsedCurrencies[0], "Bakery");

		const classForTestIdTDs = (testId) => async (index) =>
			await (await page.getByTestId(testId).nth(index)).evaluate((el) =>
				String(el.parentElement.parentElement.parentElement.className).replace(
					/\s+/g,
					" ",
				),
			);
		const editorRemainingClass = classForTestIdTDs("editorRemaining");

		// Allocate on budget and wait for calculated used/remaining
		expect(page.getByText("R$").first()).toBeDefined();
		await Input(page, "editorAllocated", undefined, 0).change("65,00");
		await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("89,8");
		await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue(
			"-24,80",
		);
		expect(await editorRemainingClass(0)).toEqual(
			"bg-background-800 bg-red-800",
		);

		await Input(page, "editorAllocated", undefined, 1).change("5435,25");
		await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("1.234,56");
		await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue(
			"4.200,69",
		);
		expect(await editorRemainingClass(1)).toEqual("bg-background-600 ");

		// Go to Import
		await tourNext(page);
		expect(page.getByText("New import")).toBeDefined();

		// Finish on Transactions
		await tourNext(page);
		expect(page.getByText("Gas Station")).toBeDefined();

		// Close Tour
		await tourNext(page);

		// Tour is closed
		expect(page.getByTestId("nm-modal-title")).toBeHidden();

		// Import
		await page.getByText("Import").click();

		await page
			.getByTestId("importFile")
			.setInputFiles("./fixture/bank_statement_a.csv");

		expect(page.getByText("bank_statement_a.csv")).toBeDefined();

		await page.waitForFunction(
			(selector) => !document.querySelector(selector),
			"[data-testid=loadingProgress]",
		);

		const expectedImportRows = 5;
		expect(page.getByTestId("editorTo")).toHaveCount(expectedImportRows);

		const editorFromClass = classForTestIdTDs("editorFrom");
		const editorToClass = classForTestIdTDs("editorTo");
		expect(
			await Promise.all(
				Array.from({ length: expectedImportRows }).map(async (_v, index) => ({
					fromClasses: await editorFromClass(index),
					toClasses: await editorToClass(index),
				})),
			),
		).toEqual([
			{
				fromClasses: "bg-background-800 ",
				toClasses: "bg-background-800 bg-green-900",
			},
			{
				fromClasses: "bg-background-600 ",
				toClasses: "bg-background-600 bg-green-950",
			},
			{
				fromClasses: "bg-background-800 ",
				toClasses: "bg-background-800 bg-green-900",
			},
			{
				fromClasses: "bg-background-600 ",
				toClasses: "bg-background-600 bg-green-950",
			},
			{
				fromClasses: "bg-background-800 ",
				toClasses: "bg-background-800 bg-green-900",
			},
		]);
	});
});
