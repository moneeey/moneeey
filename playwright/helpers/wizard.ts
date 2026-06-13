import { type Locator, type Page, expect } from "@playwright/test";
import { mostUsedCurrencies } from "./fixtures";
import { Input, Select } from "./page-objects";

export const E2E_PASSPHRASE = "playwright-test-pass-123";

type SeedAccount = {
	id?: string;
	name: string;
	currency?: string;
	kind?: "CHECKING" | "INVESTMENT" | "SAVINGS" | "CREDIT_CARD" | "PAYEE";
	initialBalance?: number;
};

type SeedTransaction = {
	id?: string;
	from: string;
	to: string;
	amount?: number;
	fromValue?: number;
	toValue?: number;
	date?: string;
	memo?: string;
};

type SeedTestEnvironmentOptions = {
	passphrase?: string;
	accounts?: SeedAccount[];
	transactions?: SeedTransaction[];
	skipTour?: boolean;
};

type TestEnvironmentWindow = Window & {
	moneeeySetupTestEnvironment?: (
		options?: SeedTestEnvironmentOptions,
	) => Promise<void>;
};

export const defaultSeedAccounts: SeedAccount[] = [
	{
		id: "test-account-01-banco",
		name: "Banco Moneeey",
		currency: "BRL",
		initialBalance: 1234.56,
	},
	{
		id: "test-account-02-card",
		name: "MoneeeyCard",
		currency: "BRL",
		initialBalance: 2000,
	},
	{
		id: "test-account-03-bitcoin",
		name: "Bitcoinss",
		currency: "BTC",
		initialBalance: 0.12345678,
	},
];

export const defaultTransactionAccounts: SeedAccount[] = [
	...defaultSeedAccounts,
	{ id: "test-payee-bakery", name: "Bakery123", kind: "PAYEE" },
	{ id: "test-payee-ristorant", name: "Ristorant88", kind: "PAYEE" },
	{ id: "test-payee-playxbox", name: "Playxbox421", kind: "PAYEE" },
	{ id: "test-payee-cashback", name: "Cashbazk", kind: "PAYEE" },
];

export const defaultTransactions: SeedTransaction[] = [
	{
		id: "test-transaction-card-income",
		from: "Banco Moneeey",
		to: "MoneeeyCard",
		amount: 3000,
	},
	{
		id: "test-transaction-card-bakery",
		from: "MoneeeyCard",
		to: "Bakery123",
		amount: 60,
		memo: "pao",
	},
	{
		id: "test-transaction-card-dinner",
		from: "MoneeeyCard",
		to: "Ristorant88",
		amount: 128,
	},
	{
		id: "test-transaction-card-playxbox",
		from: "MoneeeyCard",
		to: "Playxbox421",
		amount: 7213.21,
	},
	{
		id: "test-transaction-card-cashback",
		from: "Cashbazk",
		to: "MoneeeyCard",
		amount: 69.42,
		memo: "cashback",
	},
];

export async function seedTestEnvironment(
	page: Page,
	options: SeedTestEnvironmentOptions = {},
) {
	await page.goto("/#/dashboard");
	await page.waitForFunction(
		() =>
			typeof (window as TestEnvironmentWindow).moneeeySetupTestEnvironment ===
			"function",
	);
	await page.evaluate(
		async (setupOptions) => {
			const setup = (window as TestEnvironmentWindow)
				.moneeeySetupTestEnvironment;
			if (!setup) throw new Error("moneeeySetupTestEnvironment unavailable");
			await setup(setupOptions);
		},
		{ passphrase: E2E_PASSPHRASE, ...options },
	);
	await expect(page.getByText("Dashboard")).toBeVisible();
}

export async function completeEncryptionSetup(
	page: Page,
	passphrase: string = E2E_PASSPHRASE,
) {
	await page.getByRole("button", { name: "Sign up (local only)" }).click();
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
	await page.getByTestId("encryptionPassphrase").fill(passphrase);
	await page.getByTestId("encryptionPassphraseConfirm").fill(passphrase);
	await page
		.getByRole("button", { name: "Create passphrase and continue" })
		.click();
}

export async function unlockWithPassphrase(
	page: Page,
	passphrase: string = E2E_PASSPHRASE,
) {
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
	await expect(page.getByTestId("encryptionPassphraseConfirm")).toHaveCount(0);
	await page.getByTestId("encryptionPassphrase").fill(passphrase);
	await page.getByTestId("ok-button").click();
}

export async function completeLandingWizard(page: Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");
	await page.getByTestId("ok-button").click();

	await completeEncryptionSetup(page);

	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();
	const defaultCurrencySelector = Select(page, "defaultCurrencySelector");
	expect(await defaultCurrencySelector.options()).toEqual(mostUsedCurrencies);
	await defaultCurrencySelector.choose(mostUsedCurrencies[0]);
	await expect(page.getByTestId("ok-button")).toContainText("Continue");
	await page.getByTestId("ok-button").click();

	// The currency picker on account forms uses `expect().toHaveText()` so
	// Playwright auto-retries until the react-select finishes rehydrating
	// the CONFIG default after each `save-and-add-another` re-mounts it.
	const currencyValueText = () =>
		page
			.getByTestId("editorCurrency")
			.locator(".mn-select__single-value, .mn-select__placeholder");

	await Input(page, "name").change("Banco Moneeey");
	await expect(currencyValueText()).toHaveText("BRL Brazilian Real");
	await Input(page, "editorInitial_balance").change("1234,56", "1.234,56");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("MoneeeyCard");
	await expect(currencyValueText()).toHaveText("BRL Brazilian Real");
	await Input(page, "editorInitial_balance").change("2000,00", "2.000");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("Bitcoinss");
	await Select(page, "editorCurrency").choose("BTC Bitcoin");
	await Input(page, "editorInitial_balance").change(
		"0,123456789",
		"0,12345678",
	);
	await expect(currencyValueText()).toHaveText("BTC Bitcoin");
	await page.getByTestId("save-and-close").click();

	await expect(page.getByText("Dashboard")).toBeVisible();
}

export async function budgetEditorSave(
	page: Page,
	name: string,
	tag: string,
	expectedTags?: string[],
) {
	await page
		.getByTestId(/^addNewBudget_/)
		.first()
		.click();

	const budgetEditor = page.getByTestId("budgetEditorDrawer");
	await Input(page, "budgetName", budgetEditor).change(name);

	const budgetTags = Select(page, "budgetTags");
	if (expectedTags) {
		expect(await budgetTags.options()).toEqual(expectedTags);
	}
	await budgetTags.choose(tag, false);

	await budgetEditor.getByTestId("budgetSave").click();
}

export function tourNext(page: Page) {
	return page.getByTestId("nm-modal-card").getByTestId("next").click();
}

export async function withBudgetEditor(
	page: Page,
	index: number,
	fn: (drawer: Locator) => Promise<void>,
) {
	await page.getByTestId("editorBudget").nth(index).click();
	const drawer = page.getByTestId("budgetEditorDrawer");
	await expect(drawer).toBeVisible();
	await fn(drawer);
	if (await drawer.isVisible()) {
		await drawer.getByText("Close").click();
		await expect(drawer).not.toBeVisible();
	}
}
