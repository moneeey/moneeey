import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	BudgetRow,
	OpenMenuItem,
	Select,
	budgetEditorSave,
	expect,
	retrieveRowsData,
	test,
	updateOnAllTransactions,
	withBudgetEditor,
} from "../helpers";

test("Budget lifecycle — create, allocate, open editor, view archived toggle", async ({
	wizardPage: page,
}) => {
	// Add transactions for budget testing
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Gas Station", "100");
	await updateOnAllTransactions(page, 4, "Banco Moneeey", "Bakery", "50");

	// Verify the transactions are correct before checking budgets
	const today = formatDate(new Date());
	expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 6)).toEqual([
		`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Banco Moneeey (bg---600) | to: Gas Station (bg---600) | amount: 100 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Banco Moneeey (bg---800) | to: Bakery (bg---800) | amount: 50 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: From (bg---600) | to: To (bg---600) | amount: 0 (bg---600) | memo:  (bg---600)`,
	]);

	// Navigate to Budget and create two budgets
	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Fuel", "Gas Station");
	await budgetEditorSave(page, "Food", "Bakery");

	// Budgets are sorted alphabetically: Food (0), Fuel (1)
	await expect(page.getByText("R$").first()).toBeVisible();

	// Index 0 = Food (Bakery): allocate 30, used=50, remaining=-20 (red)
	const food = BudgetRow(page, 0);
	await food.allocate("30");
	await food.expectUsed("50");
	await food.expectRemaining("-20", "bg---800 opacity-80 text-negative");

	// Index 1 = Fuel (Gas Station): allocate 200, used=100, remaining=100
	const fuel = BudgetRow(page, 1);
	await fuel.allocate("200");
	await fuel.expectUsed("100");
	await fuel.expectRemaining("100");

	// Open editor for existing budget to verify fields
	await withBudgetEditor(page, 0, async (drawer) => {
		await expect(drawer.getByTestId("budgetName")).toHaveValue("Food");
		await expect(page.getByTestId("budgetIsArchived")).not.toBeChecked();
	});

	// View archived toggle
	await expect(page.getByTestId("checkboxViewArchived")).not.toBeChecked();
	await page.getByTestId("checkboxViewArchived").click();
	await expect(page.getByTestId("checkboxViewArchived")).toBeChecked();
	await page.getByTestId("checkboxViewArchived").click();
	await expect(page.getByTestId("checkboxViewArchived")).not.toBeChecked();
});

test("Budget allocation can be set to zero", async ({ wizardPage: page }) => {
	// Regression: `&&` truthy checks in InputNumber treated 0 as falsy and
	// dropped the change. Allocation must apply immediately and persist.
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "50");

	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", "Bakery");
	await expect(page.getByText("R$").first()).toBeVisible();

	const food = BudgetRow(page, 0);

	// Start with a non-zero allocation so we can verify the transition to 0
	await food.allocate("100");
	await food.expectAllocated("100");

	// Set allocation to 0 — this used to silently no-op
	await food.allocate("0");
	await food.expectAllocated("0");

	// Navigate away and back to verify the value survived re-render.
	await OpenMenuItem(page, "All transactions");
	await OpenMenuItem(page, "Budget");
	await food.expectAllocated("0");
});

test("Archived budgets have a visual indicator when shown", async ({
	wizardPage: page,
}) => {
	// Create a transaction so that "Bakery" becomes a known tag for budgets.
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "50");

	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", "Bakery");
	await expect(page.getByText("R$").first()).toBeVisible();

	// Archive the budget via its editor
	await withBudgetEditor(page, 0, async (drawer) => {
		await drawer.getByTestId("budgetIsArchived").click();
		await expect(drawer.getByTestId("budgetIsArchived")).toBeChecked();
		await drawer.getByTestId("budgetSave").click();
		await expect(drawer).not.toBeVisible();
	});

	// Archived budget is hidden by default
	await expect(page.getByText("Food (archived)")).toHaveCount(0);

	// Flip the "view archived" toggle on
	await page.getByTestId("checkboxViewArchived").click();
	await expect(page.getByTestId("checkboxViewArchived")).toBeChecked();

	// The archived row now shows with the `(archived)` suffix on the name
	await expect(page.getByText("Food (archived)").first()).toBeVisible();

	// The allocated cell's parent <span> carries the `archived-row` class.
	const allocatedCellParentClass =
		(await page
			.getByTestId("inputContainereditorAllocated")
			.first()
			.locator("..")
			.getAttribute("class")) ?? "";
	expect(allocatedCellParentClass).toContain("archived-row");
});

test("Budget usage recalculates when tags change", async ({
	wizardPage: page,
}) => {
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "100");
	await updateOnAllTransactions(page, 4, "Banco Moneeey", "Gas Station", "42");

	// Create a budget tracking "Bakery" → used should settle at 100
	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", "Bakery");
	const food = BudgetRow(page, 0);
	await food.expectUsed("100");

	// Open the budget and swap its tag from "Bakery" to "Gas Station"
	await withBudgetEditor(page, 0, async (drawer) => {
		await drawer.locator(".mn-select__multi-value__remove").first().click();
		await Select(page, "budgetTags").choose("Gas Station", false);
		await drawer.getByTestId("budgetSave").click();
		await expect(drawer).not.toBeVisible();
	});

	// `used` drops from 100 (Bakery) to 42 (Gas Station) — regression guard.
	await food.expectUsed("42");
});
