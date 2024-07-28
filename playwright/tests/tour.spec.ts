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

function Select(page: Page, testId: string) {
	const select = page.getByTestId(testId).first();
	const input = select.locator(".mn-select__input");
	const menuList = page.locator(".mn-select__menu-list");

	const isClosed = async () => await menuList.isHidden();
	const open = async () => {
		if (await isClosed()) {
			await select.click();
		}
	};

	return {
		async value() {
			return select.locator(".mn-select__single-value").innerText();
		},
		async options() {
			await open();
			return await menuList.locator(".mn-select__option").allTextContents();
		},
		async create(optionName: string) {
			await open();
			await input.fill(optionName);
			await input.press("Enter");
			await isClosed();
		},
		async choose(optionName: string, exact = true) {
			await open();
			const option = menuList.getByText(optionName, { exact });
			await option.click();
			await isClosed();
		},
	};
}

function Input(page: Page, testId: string, container?: Locator) {
	const input = (container || page).getByTestId(testId).first();

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
	const budgetEditor = page.getByTestId("budgetEditorDrawer");
	await Input(page, "budgetName", budgetEditor).change(name);

	const budgetCurrency = Select(page, "budgetCurrency");
	expect(await budgetCurrency.options()).toEqual(mostUsedCurrencies);
	await budgetCurrency.choose(currency);

	const budgetTags = Select(page, "budgetTags");
	expect(await budgetTags.options()).toEqual([
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
		const editorFrom = Select(page, "editorFrom");
		expect((await editorFrom.options()).sort()).toEqual([
			"Banco Moneeey",
			"Bitcoinss",
			"Initial balance BRL",
			"Initial balance BTC",
		]);
		await editorFrom.choose("Banco Moneeey");

		// Create new payee
		const editorTo = Select(page, "editorTo");
		await editorTo.create("Gas Station");

		// Fill the amount
		await expect(page.getByTestId("editorAmount")).toHaveCount(3);
		await Input(page, "editorAmount").change("1234,56");

		// Progress Tour to Transactions
		await tourNext(page);
		expect(page.getByText("time to budget")).toBeDefined();

		// Cant progress because must create budget
		await tourNext(page);
		await dismissNotification(
			page,
			"Before continuing, please click on 'New Budget' and create a budget",
		);

		// New budget
		await page.getByTestId("addNewBudget").first().click();

		// Create budget
		BudgetEditorSave(page, "Budget test", mostUsedCurrencies[0], "Gas Station");

		// Allocate on budget and wait for calculated used/remaining
		expect(page.getByText("R$").first()).toBeDefined();
		await Input(page, "editorAllocated").change("5435,25");
		await expect(page.getByTestId("editorUsed").first()).toHaveValue(
			"1.234,56",
		);
		await expect(page.getByTestId("editorRemaining").first()).toHaveValue(
			"4.200,69",
		);

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
	});
});
