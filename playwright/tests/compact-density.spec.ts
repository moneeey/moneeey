import {
	BudgetRow,
	OpenMenuItem,
	budgetEditorSave,
	clickMenuByTestId,
	expect,
	retrieveRowsData,
	test,
	updateOnAllTransactions,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";

// Matches the compactLayout in TransactionTable for the all-transactions view.
const COMPACT_ALL_TX_LAYOUT = [
	["editorDate", "editorMemo"],
	["editorFrom", "editorFrom_amount"],
	["editorTo", "editorTo_amount"],
];

// Matches the compactLayout in TransactionTable for the reference-account view.
const COMPACT_REFERENCE_LAYOUT = [
	["editorDate", "editorMemo", "editorRunning"],
	["editorAccount", "editorAmount"],
];

// Matches the compactLayout in AccountTable for non-payee accounts.
const COMPACT_ACCOUNT_LAYOUT = [
	["editorName", "editorTags"],
	["editorType", "editorCurrency"],
];

// Matches the compactLayout in CurrencyTable.
const COMPACT_CURRENCY_LAYOUT = [
	["editorName", "editorTags"],
	["editorShort", "editorPrefix", "editorSuffix", "editorDecimals"],
];

async function setDensity(
	page: import("@playwright/test").Page,
	mode: "compact" | "full" | "auto",
) {
	await clickMenuByTestId(page, SETTINGS_MENU_TESTID);
	await page.getByTestId(`tableDensitySwitcher_${mode}`).click();
}

test("Density switcher — picking compact persists and shows active ring", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");

	const stored = await page.evaluate(() =>
		window.localStorage.getItem("tableDensity"),
	);
	expect(stored).toBe("compact");

	const compactBtn = page.getByTestId("tableDensitySwitcher_compact");
	await expect(compactBtn).toHaveClass(/ring-4/);

	await page.getByTestId("tableDensitySwitcher_full").click();
	const stored2 = await page.evaluate(() =>
		window.localStorage.getItem("tableDensity"),
	);
	expect(stored2).toBe("full");
});

test("Compact all-transactions — header and rows show per-side amounts", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");
	await OpenMenuItem(page, "All transactions");

	const header = page.locator(".transactionTable-header");
	await expect(header).toBeVisible();
	await expect(header).toContainText("Date");
	await expect(header).toContainText("Memo");
	await expect(header).toContainText("From");
	await expect(header).toContainText("To");
	await expect(header).toContainText("From amount");
	await expect(header).toContainText("To amount");

	const today = new Date().toISOString().slice(0, 10);
	expect(await retrieveRowsData(page, COMPACT_ALL_TX_LAYOUT, 4)).toEqual([
		[
			`date: ${today} (text-xs text-muted-foreground) | memo:  ()`,
			`from: Initial balance BRL (min-w-0 grow) | from_amount: 1.234,56 (text-right [&_input]:text-right text-negative)`,
			`to: Banco Moneeey (min-w-0 grow) | to_amount: 1.234,56 (text-right [&_input]:text-right text-positive)`,
		].join("\n"),
		[
			`date: ${today} (text-xs text-muted-foreground) | memo:  ()`,
			`from: Initial balance BRL (min-w-0 grow) | from_amount: 2.000 (text-right [&_input]:text-right text-negative)`,
			`to: MoneeeyCard (min-w-0 grow) | to_amount: 2.000 (text-right [&_input]:text-right text-positive)`,
		].join("\n"),
		[
			`date: ${today} (text-xs text-muted-foreground) | memo:  ()`,
			`from: Initial balance BTC (min-w-0 grow) | from_amount: 0,12345678 (text-right [&_input]:text-right text-negative)`,
			`to: Bitcoinss (min-w-0 grow) | to_amount: 0,12345678 (text-right [&_input]:text-right text-positive)`,
		].join("\n"),
		[
			`date: ${today} (text-xs text-muted-foreground) | memo:  ()`,
			`from: From (min-w-0 grow) | from_amount: 0 (text-right [&_input]:text-right)`,
			`to: To (min-w-0 grow) | to_amount: 0 (text-right [&_input]:text-right)`,
		].join("\n"),
	]);
});

test("Compact reference-account view — rows show running balance inline", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");
	await OpenMenuItem(page, "BRL Banco Moneeey");

	const header = page.locator(".transactionTable-header");
	await expect(header).toContainText("Date");
	await expect(header).toContainText("Account");
	await expect(header).toContainText("Amount");
	await expect(header).toContainText("Running");

	// Wait for the running balance computation to complete on the first row.
	await expect(page.getByTestId("editorRunning").first()).toHaveValue(
		"1.234,56",
		{ timeout: 10000 },
	);

	const today = new Date().toISOString().slice(0, 10);
	expect(await retrieveRowsData(page, COMPACT_REFERENCE_LAYOUT, 2)).toEqual([
		[
			`date: ${today} (text-xs text-muted-foreground) | memo:  () | running: 1.234,56 (text-right [&_input]:text-right text-xs text-muted-foreground text-positive)`,
			`account: Initial balance BRL () | amount: 1.234,56 (text-right [&_input]:text-right text-positive)`,
		].join("\n"),
		[
			`date: ${today} (text-xs text-muted-foreground) | memo:  () | running: 0 (text-right [&_input]:text-right text-xs text-muted-foreground)`,
			`account: Account () | amount: 0 (text-right [&_input]:text-right)`,
		].join("\n"),
	]);
});

test("Compact account settings — rows show name + currency + type", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");
	await clickMenuByTestId(
		page,
		"appMenu_subitems_settings_settings_accounts",
	);

	// Wait for at least the 3 wizard accounts + the new-entity row.
	await expect(page.getByTestId("editorName")).toHaveCount(4, {
		timeout: 10000,
	});

	const rows = await retrieveRowsData(page, COMPACT_ACCOUNT_LAYOUT, 4);
	expect(rows).toEqual([
		[
			"name: Banco Moneeey () | tags: Tags ()",
			"type: Checking Account (text-xs text-muted-foreground) | currency: BRL Brazilian Real (text-xs text-muted-foreground)",
		].join("\n"),
		[
			"name: Bitcoinss () | tags: Tags ()",
			"type: Checking Account (text-xs text-muted-foreground) | currency: BTC Bitcoin (text-xs text-muted-foreground)",
		].join("\n"),
		[
			"name: MoneeeyCard () | tags: Tags ()",
			"type: Checking Account (text-xs text-muted-foreground) | currency: BRL Brazilian Real (text-xs text-muted-foreground)",
		].join("\n"),
		[
			"name:  () | tags: Tags ()",
			"type: Checking Account (text-xs text-muted-foreground) | currency: BRL Brazilian Real (text-xs text-muted-foreground)",
		].join("\n"),
	]);
});

test("Compact currency settings — header and rows show short/prefix/decimals", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");
	await clickMenuByTestId(
		page,
		"appMenu_subitems_settings_settings_currencies",
	);

	const header = page.locator(".currencyTable-header");
	await expect(header).toBeVisible();
	await expect(header).toContainText("Name");
	await expect(header).toContainText("Short");

	const rows = await retrieveRowsData(page, COMPACT_CURRENCY_LAYOUT);
	const brl = rows.find((r) => r.startsWith("name: Brazilian Real"));
	const btc = rows.find((r) => r.startsWith("name: Bitcoin"));
	expect(brl).toBe(
		[
			"name: Brazilian Real () | tags: Tags ()",
			"short: BRL (text-xs text-muted-foreground) | prefix: R$ (text-xs text-muted-foreground) | suffix:  (text-xs text-muted-foreground) | decimals: 2 (text-xs text-muted-foreground)",
		].join("\n"),
	);
	expect(btc).toBe(
		[
			"name: Bitcoin () | tags: Tags ()",
			"short: BTC (text-xs text-muted-foreground) | prefix: ₿ (text-xs text-muted-foreground) | suffix:  (text-xs text-muted-foreground) | decimals: 8 (text-xs text-muted-foreground)",
		].join("\n"),
	);
});

test("Compact budget — rows allocate, used and remaining stay in sync", async ({
	wizardPage: page,
}) => {
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Cafe", "30");

	await setDensity(page, "compact");
	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "FoodBudget", "Cafe");

	const card = page.getByTestId(/^budget_period_/).first();
	await expect(card).toContainText("Budget");
	await expect(card).toContainText("Allocated");
	await expect(card).toContainText("Remaining");
	await expect(card).toContainText("Used");

	const row = BudgetRow(page, 0);
	await row.allocate("100");
	await row.expectUsed("30");
	await row.expectRemaining("70");
});
