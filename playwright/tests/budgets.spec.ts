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

test("Budget — zero-allocation persists, tag swap recalculates used, archive shows indicator", async ({
	wizardPage: page,
}) => {
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "100");
	await updateOnAllTransactions(page, 4, "Banco Moneeey", "Gas Station", "42");

	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", "Bakery");
	await expect(page.getByText("R$").first()).toBeVisible();

	const food = BudgetRow(page, 0);

	await test.step("allocation can be set to zero and persists across re-render", async () => {
		await food.expectUsed("100");
		await food.allocate("100");
		await food.expectAllocated("100");
		await food.allocate("0");
		await food.expectAllocated("0");
		await OpenMenuItem(page, "All transactions");
		await OpenMenuItem(page, "Budget");
		await food.expectAllocated("0");
	});

	await test.step("used recalculates when tags change", async () => {
		await withBudgetEditor(page, 0, async (drawer) => {
			await drawer.locator(".mn-select__multi-value__remove").first().click();
			await Select(page, "budgetTags").choose("Gas Station", false);
			await drawer.getByTestId("budgetSave").click();
			await expect(drawer).not.toBeVisible();
		});
		await food.expectUsed("42");
	});

	await test.step("archived budget is hidden by default and shows indicator when toggled on", async () => {
		await withBudgetEditor(page, 0, async (drawer) => {
			await drawer.getByTestId("budgetIsArchived").click();
			await expect(drawer.getByTestId("budgetIsArchived")).toBeChecked();
			await drawer.getByTestId("budgetSave").click();
			await expect(drawer).not.toBeVisible();
		});

		await expect(page.getByText("Food (archived)")).toHaveCount(0);

		await page.getByTestId("checkboxViewArchived").click();
		await expect(page.getByTestId("checkboxViewArchived")).toBeChecked();
		await expect(page.getByText("Food (archived)").first()).toBeVisible();

		const allocatedCellParentClass =
			(await page
				.getByTestId("inputContainereditorAllocated")
				.first()
				.locator("..")
				.getAttribute("class")) ?? "";
		expect(allocatedCellParentClass).toContain("archived-row");
	});
});
