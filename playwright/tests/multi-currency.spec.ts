import { expect, test } from "@playwright/test";
import {
	Input,
	OpenMenuItem,
	Select,
	budgetEditorSave,
	closeTourModal,
	completeLandingWizard,
	mostUsedCurrencies,
	resetAppState,
	updateOnAllTransactions,
} from "../helpers";

test.beforeEach(async ({ page }) => {
	await resetAppState(page);
});

test("Multi-currency transactions in both directions with budget tracking", async ({
	page,
}) => {
	await completeLandingWizard(page);
	await closeTourModal(page);

	// Start with a same-currency BRL expense before adding multi-currency rows,
	// so the editorAmount indices for multi-currency rows are easier to reason about.
	await OpenMenuItem(page, "All transactions");
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Gas Station", "200");

	// === Direction 1: BRL → BTC ===
	// Row 4 is the new empty row. Setting accounts with different currencies
	// makes the amount column render two side-by-side editorAmount inputs.
	await Select(page, "editorFrom", 4).chooseOrCreate("Banco Moneeey");
	await Select(page, "editorTo", 4).chooseOrCreate("Bitcoinss");

	// editorAmount indices: 0,1,2 = 3 initial balances, 3 = Gas Station (single)
	// Row 4 has two amount inputs: index 4 = BRL from, index 5 = BTC to
	await Input(page, "editorAmount", undefined, 4).change("100");
	await Input(page, "editorAmount", undefined, 5).change("0,01000000", "0,01");

	// Banco Moneeey balance: 1.234,56 - 200 - 100 = 934,56
	await OpenMenuItem(page, "BRL Banco Moneeey");
	await Input(page, "editorRunning", undefined, 2).toHaveValue("934,56");

	// Bitcoinss balance: 0,12345678 + 0,01 = 0,13345678
	await OpenMenuItem(page, "BTC Bitcoinss");
	await Input(page, "editorRunning", undefined, 1).toHaveValue("0,13345678");

	// === Direction 2: BTC → BRL ===
	await OpenMenuItem(page, "All transactions");
	await Select(page, "editorFrom", 5).chooseOrCreate("Bitcoinss");
	await Select(page, "editorTo", 5).chooseOrCreate("MoneeeyCard");

	// Row 5 amount indices: index 6 = BTC from, index 7 = BRL to
	// (Row 4 consumed two amount indices because it's multi-currency)
	await Input(page, "editorAmount", undefined, 6).change("0,05000000", "0,05");
	await Input(page, "editorAmount", undefined, 7).change("500");

	// Bitcoinss balance: 0,13345678 - 0,05 = 0,08345678
	await OpenMenuItem(page, "BTC Bitcoinss");
	await Input(page, "editorRunning", undefined, 2).toHaveValue("0,08345678");

	// MoneeeyCard balance: 2.000 + 500 = 2.500
	await OpenMenuItem(page, "BRL MoneeeyCard");
	await Input(page, "editorRunning", undefined, 1).toHaveValue("2.500");

	// === Budget over multi-currency transactions ===
	await OpenMenuItem(page, "Budget");

	// Gas Station budget (same-currency) — used = 200
	await budgetEditorSave(
		page,
		"Gas Budget",
		mostUsedCurrencies[0],
		"Gas Station",
	);
	await expect(page.getByText("R$").first()).toBeVisible();
	await Input(page, "editorAllocated", undefined, 0).change("300", "300");
	await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("200", {
		timeout: 15000,
	});
	await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue("100", {
		timeout: 15000,
	});

	// Banco Moneeey-tagged budget — matches Gas Station (200) only
	// (The multi-currency BRL→BTC transaction's from_value is NOT counted here
	// because budget used-calculation excludes cross-currency from the budget.)
	await budgetEditorSave(
		page,
		"Crypto Expenses",
		mostUsedCurrencies[0],
		"Banco Moneeey",
	);
	await Input(page, "editorAllocated", undefined, 1).change("500", "500");
	await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("200", {
		timeout: 15000,
	});
	await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue("300", {
		timeout: 15000,
	});
});
