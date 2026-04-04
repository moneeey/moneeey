import { expect, test } from "@playwright/test";
import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	budgetEditorSave,
	classForTestIdTDs,
	closeTourModal,
	completeLandingWizard,
	Input,
	mostUsedCurrencies,
	OpenMenuItem,
	resetAppState,
	retrieveRowsData,
	updateOnAllTransactions,
} from "../helpers";

test.beforeEach(async ({ page }) => {
	await resetAppState(page);
});

test("Budget lifecycle — create, allocate, open editor, view archived toggle", async ({
	page,
}) => {
	await completeLandingWizard(page);
	await closeTourModal(page);

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
	await budgetEditorSave(page, "Fuel", mostUsedCurrencies[0], "Gas Station");
	await budgetEditorSave(page, "Food", mostUsedCurrencies[0], "Bakery");

	// Budgets are sorted alphabetically: Food (0), Fuel (1)
	await expect(page.getByText("R$").first()).toBeVisible();

	// Index 0 = Food (Bakery): allocate 30, used=50, remaining=-20 (red)
	await Input(page, "editorAllocated", undefined, 0).change("30", "30");
	await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("50", {
		timeout: 15000,
	});
	await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue("-20", {
		timeout: 15000,
	});
	const editorRemainingClass = classForTestIdTDs(page, "editorRemaining");
	expect(await editorRemainingClass(0)).toEqual(
		"bg---800 opacity-80 text-red-200",
	);

	// Index 1 = Fuel (Gas Station): allocate 200, used=100, remaining=100
	await Input(page, "editorAllocated", undefined, 1).change("200", "200");
	await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("100", {
		timeout: 15000,
	});
	await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue("100", {
		timeout: 15000,
	});

	// Open editor for existing budget to verify fields
	await page.getByTestId("editorBudget").nth(0).click();
	await expect(page.getByTestId("budgetEditorDrawer")).toBeVisible();
	await expect(
		page.getByTestId("budgetEditorDrawer").getByTestId("budgetName"),
	).toHaveValue("Food");
	await expect(page.getByTestId("budgetIsArchived")).not.toBeChecked();
	await page.getByTestId("budgetEditorDrawer").getByText("Close").click();
	await expect(page.getByTestId("budgetEditorDrawer")).not.toBeVisible();

	// View archived toggle
	await expect(page.getByTestId("checkboxViewArchived")).not.toBeChecked();
	await page.getByTestId("checkboxViewArchived").click();
	await expect(page.getByTestId("checkboxViewArchived")).toBeChecked();
	await page.getByTestId("checkboxViewArchived").click();
	await expect(page.getByTestId("checkboxViewArchived")).not.toBeChecked();
});
