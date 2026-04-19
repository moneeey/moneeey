import {
	BudgetRow,
	Input,
	OpenMenuItem,
	Select,
	budgetEditorSave,
	clickMenuByTestId,
	expect,
	retrieveRowsData,
	test,
	updateOnAllTransactions,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";

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
	expect(await retrieveRowsData(page, "transactionTable", 4)).toEqual([
		[
			`date: ${today} (text-muted-foreground) | memo:  (text-muted-foreground)`,
			"from: Initial balance BRL (min-w-0 grow) | from_amount: 1.234,56 (text-right [&_input]:text-right text-negative)",
			"to: Banco Moneeey (min-w-0 grow) | to_amount: 1.234,56 (text-right [&_input]:text-right text-positive)",
		].join("\n"),
		[
			`date: ${today} (text-muted-foreground) | memo:  (text-muted-foreground)`,
			"from: Initial balance BRL (min-w-0 grow) | from_amount: 2.000 (text-right [&_input]:text-right text-negative)",
			"to: MoneeeyCard (min-w-0 grow) | to_amount: 2.000 (text-right [&_input]:text-right text-positive)",
		].join("\n"),
		[
			`date: ${today} (text-muted-foreground) | memo:  (text-muted-foreground)`,
			"from: Initial balance BTC (min-w-0 grow) | from_amount: 0,12345678 (text-right [&_input]:text-right text-negative)",
			"to: Bitcoinss (min-w-0 grow) | to_amount: 0,12345678 (text-right [&_input]:text-right text-positive)",
		].join("\n"),
		[
			`date: ${today} (text-muted-foreground) | memo:  (text-muted-foreground)`,
			"from: From (min-w-0 grow) | from_amount: 0 (text-right [&_input]:text-right)",
			"to: To (min-w-0 grow) | to_amount: 0 (text-right [&_input]:text-right)",
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
	expect(await retrieveRowsData(page, "transactionTable", 2)).toEqual([
		[
			`date: ${today} (text-muted-foreground) | memo:  () | running: 1.234,56 (text-right [&_input]:text-right text-muted-foreground text-positive)`,
			"account: Initial balance BRL () | amount: 1.234,56 (text-right [&_input]:text-right text-positive)",
		].join("\n"),
		[
			`date: ${today} (text-muted-foreground) | memo:  () | running: 0 (text-right [&_input]:text-right text-muted-foreground)`,
			"account: Account () | amount: 0 (text-right [&_input]:text-right)",
		].join("\n"),
	]);
});

test("Compact account settings — rows show name + currency + type", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");
	await clickMenuByTestId(page, "appMenu_subitems_settings_settings_accounts");

	const rows = await retrieveRowsData(page, "accountTableCHECKING", 4);
	expect(rows).toEqual([
		[
			"name: Banco Moneeey () | tags: Tags ()",
			"type: Checking Account (text-muted-foreground) | currency: BRL Brazilian Real (text-muted-foreground)",
		].join("\n"),
		[
			"name: Bitcoinss () | tags: Tags ()",
			"type: Checking Account (text-muted-foreground) | currency: BTC Bitcoin (text-muted-foreground)",
		].join("\n"),
		[
			"name: MoneeeyCard () | tags: Tags ()",
			"type: Checking Account (text-muted-foreground) | currency: BRL Brazilian Real (text-muted-foreground)",
		].join("\n"),
		[
			"name:  () | tags: Tags ()",
			"type: Checking Account (text-muted-foreground) | currency: BRL Brazilian Real (text-muted-foreground)",
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

	const rows = await retrieveRowsData(page, "currencyTable");
	const brl = rows.find((r) => r.startsWith("name: Brazilian Real"));
	const btc = rows.find((r) => r.startsWith("name: Bitcoin"));
	expect(brl).toBe(
		[
			"name: Brazilian Real () | tags: Tags ()",
			"short: BRL (text-muted-foreground) | prefix: R$ (text-muted-foreground) | suffix:  (text-muted-foreground) | decimals: 2 (text-muted-foreground)",
		].join("\n"),
	);
	expect(btc).toBe(
		[
			"name: Bitcoin () | tags: Tags ()",
			"short: BTC (text-muted-foreground) | prefix: ₿ (text-muted-foreground) | suffix:  (text-muted-foreground) | decimals: 8 (text-muted-foreground)",
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

test("Compact multi-currency — from and to amounts edit independently", async ({
	wizardPage: page,
}) => {
	// Firefox CI needs extra headroom for react-select + row-remount cascades.
	test.setTimeout(90_000);

	// Pick accounts with different currencies while still in full mode so the
	// editor* selects resolve; afterwards we switch to compact where the
	// TransactionAmountField splits into editorFrom_amount and editorTo_amount.
	await OpenMenuItem(page, "All transactions");
	await Select(page, "editorFrom", 3).chooseOrCreate("Banco Moneeey"); // BRL
	await Select(page, "editorTo", 3).chooseOrCreate("Bitcoinss"); // BTC

	await setDensity(page, "compact");
	await OpenMenuItem(page, "All transactions");

	// Row 3 is the cross-currency transaction; row 4 is the empty new-entity row.
	const fromAmount = Input(page, "editorFrom_amount", undefined, 3);
	const toAmount = Input(page, "editorTo_amount", undefined, 3);
	await fromAmount.change("250", "250");
	await toAmount.change("0,00500000", "0,005");

	// The two sides keep their own values because the currencies differ.
	await fromAmount.toHaveValue("250");
	await toAmount.toHaveValue("0,005");
});
