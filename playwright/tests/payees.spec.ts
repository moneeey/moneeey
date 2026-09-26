import {
	Input,
	OpenMenuItem,
	clickMenuByTestId,
	defaultSeedAccounts,
	expect,
	seedTestEnvironment,
	test,
} from "../helpers";

const PAYEES_MENU_TESTID = "appMenu_subitems_settings_settings_payees";

test("Payee settings — view, rename payee, and verify transaction reflection", async ({
	seededPage: page,
}) => {
	await seedTestEnvironment(page, {
		accounts: [
			...defaultSeedAccounts,
			{ id: "test-payee-bakery", name: "Bakery123", kind: "PAYEE" },
		],
		transactions: [
			{
				id: "test-transaction-bread",
				from: "MoneeeyCard",
				to: "Bakery123",
				amount: 35,
				memo: "fresh baguettes",
			},
		],
	});

	// Navigate to Settings > Payees
	await clickMenuByTestId(page, PAYEES_MENU_TESTID);

	// Payee table renders Bakery123 at index 0
	await expect(page.getByTestId("editorName").first()).toHaveValue("Bakery123", {
		timeout: 10_000,
	});

	// Rename "Bakery123" → "Artisan Bakery"
	await Input(page, "editorName", undefined, 0).change("Artisan Bakery");
	await expect(page.getByTestId("editorName").first()).toHaveValue("Artisan Bakery");

	// Verify the renamed payee reflects in All Transactions
	await OpenMenuItem(page, "All transactions");
	await expect(page.locator(".transactionTable-body")).toBeVisible();

	// The transaction row should now display "Artisan Bakery"
	await expect(
		page.locator(".transactionTable-body").getByText("Artisan Bakery").first(),
	).toBeVisible();

	// Return to Payees settings and archive the payee
	await clickMenuByTestId(page, PAYEES_MENU_TESTID);

	// Toggle archived on the payee
	const archiveCheckbox = page.getByTestId("editorArchived").first();
	await archiveCheckbox.click();
	await expect(archiveCheckbox).toBeChecked();
});
