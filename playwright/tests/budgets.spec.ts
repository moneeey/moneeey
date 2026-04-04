import { expect, test } from "@playwright/test";
import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	Input,
	OpenMenuItem,
	Select,
	budgetEditorSave,
	classForTestIdTDs,
	closeTourModal,
	completeLandingWizard,
	mostUsedCurrencies,
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

test("Budget allocation can be set to zero", async ({ page }) => {
	// Regression: InputNumber previously used truthy `&&` checks that
	// treated `0` as falsy, so typing 0 in the allocation field was silently
	// dropped — neither local state nor onChange fired. This verifies that
	// setting an allocation to zero both applies immediately and persists
	// across navigation.
	await completeLandingWizard(page);
	await closeTourModal(page);

	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "50");

	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", mostUsedCurrencies[0], "Bakery");
	await expect(page.getByText("R$").first()).toBeVisible();

	// Start with a non-zero allocation so we can verify the transition to 0
	await Input(page, "editorAllocated", undefined, 0).change("100", "100");
	await expect(page.getByTestId("editorAllocated").first()).toHaveValue(
		"100",
		{ timeout: 15000 },
	);

	// Set allocation to 0 — this used to silently no-op
	await Input(page, "editorAllocated", undefined, 0).change("0", "0");
	await expect(page.getByTestId("editorAllocated").first()).toHaveValue("0", {
		timeout: 15000,
	});

	// And it must persist: leave the page and come back
	await OpenMenuItem(page, "All transactions");
	await OpenMenuItem(page, "Budget");
	await expect(page.getByTestId("editorAllocated").first()).toHaveValue("0", {
		timeout: 15000,
	});
});

test("Archived budgets have a visual indicator when shown", async ({
	page,
}) => {
	// When the user flips "view archived" on, archived rows must be visually
	// distinguishable from active ones — same table, same columns, but
	// dimmed/italicised with an `(archived)` suffix on the name and an
	// `archived-row` class token (the hook the indicator styling attaches to).
	await completeLandingWizard(page);
	await closeTourModal(page);

	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", mostUsedCurrencies[0], "Bakery");
	await expect(page.getByText("R$").first()).toBeVisible();

	// Archive the budget via its editor
	await page.getByTestId("editorBudget").first().click();
	const drawer = page.getByTestId("budgetEditorDrawer");
	await expect(drawer).toBeVisible();
	await drawer.getByTestId("budgetIsArchived").click();
	await expect(drawer.getByTestId("budgetIsArchived")).toBeChecked();
	await drawer.getByTestId("budgetSave").click();
	await expect(drawer).not.toBeVisible();

	// Archived budget is hidden by default
	await expect(page.getByText("Food (archived)")).toHaveCount(0);

	// Flip the "view archived" toggle on
	await page.getByTestId("checkboxViewArchived").click();
	await expect(page.getByTestId("checkboxViewArchived")).toBeChecked();

	// The archived row now shows with the `(archived)` suffix on the name
	await expect(page.getByText("Food (archived)").first()).toBeVisible();

	// And the cell wraps carry the `archived-row` class token so the
	// dimmed/italic indicator styling is applied consistently across columns.
	const archivedNameCell = page
		.getByTestId("inputContainereditorBudget")
		.first();
	const parentClass =
		(await archivedNameCell
			.locator("..")
			.getAttribute("class")) ?? "";
	expect(parentClass).toContain("archived-row");
});

test("Budget usage recalculates when tags change", async ({ page }) => {
	// When a budget's tags are swapped, envelopes must be recomputed from
	// scratch so the old tag's transactions no longer contribute to `used`
	// and the new tag's transactions do.
	await completeLandingWizard(page);
	await closeTourModal(page);

	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "100");
	await updateOnAllTransactions(page, 4, "Banco Moneeey", "Gas Station", "42");

	// Create a budget tracking "Bakery" → used should settle at 100
	await OpenMenuItem(page, "Budget");
	await budgetEditorSave(page, "Food", mostUsedCurrencies[0], "Bakery");
	await expect(page.getByTestId("editorUsed").first()).toHaveValue("100", {
		timeout: 15000,
	});

	// Open the budget and swap its tag from "Bakery" to "Gas Station"
	await page.getByTestId("editorBudget").first().click();
	const drawer = page.getByTestId("budgetEditorDrawer");
	await expect(drawer).toBeVisible();
	await drawer.locator(".mn-select__multi-value__remove").first().click();
	await Select(page, "budgetTags").choose("Gas Station", false);
	await drawer.getByTestId("budgetSave").click();
	await expect(drawer).not.toBeVisible();

	// `used` must drop to the Gas Station transaction amount (42), not stay
	// at 100 (the old Bakery match) — this is the regression guard.
	await expect(page.getByTestId("editorUsed").first()).toHaveValue("42", {
		timeout: 15000,
	});
});
