import {
	BudgetRow,
	budgetEditorSave,
	completeLandingWizard,
	dismissNotification,
	expect,
	test,
	tourNext,
	updateOnAllTransactions,
} from "../helpers";

test("Tour walkthrough", async ({ seededPage: page }) => {
	// Uses seededPage (not wizardPage) because this test exercises the wizard.
	await completeLandingWizard(page);

	await page.getByTestId("start-tour").click();

	await expect(page.getByText("multi-currency")).toBeVisible();
	await tourNext(page); // Edit Currencies

	// Accounts page
	await expect(page.getByText("Manage your accounts")).toBeVisible();
	await tourNext(page); // Edit accounts

	// Transactions page — create 3 expenses
	await expect(page.getByText("generates reports and insights")).toBeVisible();

	await updateOnAllTransactions(
		page,
		2,
		"Banco Moneeey",
		"Gas Station",
		"1234,56",
		"1.234,56",
	);
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "78,69");
	await updateOnAllTransactions(page, 4, "Banco Moneeey", "Bakery", "11,11");

	await tourNext(page);
	await expect(page.getByText("Time to budget")).toBeVisible();

	// Tour blocks progress until a budget is created
	await tourNext(page);
	await dismissNotification(
		page,
		"Before continuing, click 'New Budget' and create a budget.",
	);

	const tourExpectedTags = [
		"Bakery",
		"Banco Moneeey",
		"Bitcoinss",
		"Gas Station",
		"Initial balance BRL",
		"Initial balance BTC",
		"MoneeeyCard",
	];
	await budgetEditorSave(page, "Gas", "Gas Station", tourExpectedTags);
	await budgetEditorSave(page, "Bakery", "Bakery", tourExpectedTags);

	// Allocate on budget and wait for calculated used/remaining
	await expect(page.getByText("R$").first()).toBeVisible();
	const bakery = BudgetRow(page, 0);
	await bakery.allocate("65,00", "65");
	await bakery.expectUsed("89,8");
	await bakery.expectRemaining("-24,80", "bg---800 opacity-80 text-negative");

	const gas = BudgetRow(page, 1);
	await gas.allocate("5435,25", "5.435,25");
	await gas.expectUsed("1.234,56");
	await gas.expectRemaining("4.200,69", "bg---600 opacity-80");

	// Import step
	await tourNext(page);
	await expect(page.getByText("import transactions")).toBeVisible();

	// Final step
	await tourNext(page);
	await expect(page.getByText("Gas Station")).toBeVisible();

	// Close tour
	await tourNext(page);
	await expect(page.getByTestId("nm-modal-title")).toBeHidden();
});
