import {
	BudgetRow,
	Input,
	OpenMenuItem,
	Select,
	budgetEditorSave,
	clickMenuByTestId,
	mostUsedCurrencies,
	test,
	updateOnAllTransactions,
} from "../helpers";

test("Multi-currency transactions in both directions with budget tracking", async ({
	wizardPage: page,
}) => {
	// Firefox CI needs extra headroom for react-select + row-remount cascades.
	test.setTimeout(90_000);

	// Same-currency row first so multi-currency amount indices are predictable.
	await clickMenuByTestId(page, "appMenu_subitems_transactions_all");
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
	await clickMenuByTestId(page, "appMenu_subitems_transactions_all");
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
	await clickMenuByTestId(page, "appMenu_budget");

	// Gas Station budget (same-currency) — used = 200
	await budgetEditorSave(
		page,
		"Gas Budget",
		mostUsedCurrencies[0],
		"Gas Station",
	);
	const gas = BudgetRow(page, 0);
	await gas.allocate("300");
	await gas.expectUsed("200");
	await gas.expectRemaining("100");

	// Banco Moneeey-tagged budget — matches Gas Station (200) only
	// (The multi-currency BRL→BTC transaction's from_value is NOT counted here
	// because budget used-calculation excludes cross-currency from the budget.)
	await budgetEditorSave(
		page,
		"Crypto Expenses",
		mostUsedCurrencies[0],
		"Banco Moneeey",
	);
	const crypto = BudgetRow(page, 1);
	await crypto.allocate("500");
	await crypto.expectUsed("200");
	await crypto.expectRemaining("300");
});
