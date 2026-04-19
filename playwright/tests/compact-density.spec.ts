import {
	BudgetRow,
	OpenMenuItem,
	budgetEditorSave,
	clickMenuByTestId,
	expect,
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

test("Compact all-transactions — header shows from/to and per-side amounts", async ({
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
});

test("Compact reference-account view — header shows running balance inline", async ({
	wizardPage: page,
}) => {
	await setDensity(page, "compact");

	await page.getByText("BRL Banco Moneeey").first().click();
	const header = page.locator(".transactionTable-header");
	await expect(header).toBeVisible();
	await expect(header).toContainText("Date");
	await expect(header).toContainText("Account");
	await expect(header).toContainText("Amount");
	await expect(header).toContainText("Running");
});

test("Compact budget — allocate updates remaining via header layout", async ({
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

test("Compact currency settings — name and short stay editable", async ({
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
});
