import {
	E2E_PASSPHRASE,
	OpenMenuItem,
	clickMenuByTestId,
	defaultSeedAccounts,
	expect,
	seedTestEnvironment,
	test,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";

test("Data settings — export backup JSON and restore data", async ({
	seededPage: page,
}) => {
	await seedTestEnvironment(page, {
		accounts: [
			...defaultSeedAccounts,
			{ id: "test-payee-bakery", name: "Original Bakery", kind: "PAYEE" },
		],
		transactions: [
			{
				id: "test-transaction-bread",
				from: "MoneeeyCard",
				to: "Original Bakery",
				amount: 50,
				memo: "seeded backup memo",
			},
		],
	});

	// Navigate to Settings > Preferences/General
	await clickMenuByTestId(page, SETTINGS_MENU_TESTID);

	// Click on the Data tab
	await page.getByTestId("settingsTabs_data").click();

	// Click "Export data"
	await page.getByRole("button", { name: "Export data" }).click();

	// Wait for the textarea to be populated with JSON
	const outputArea = page.getByTestId("importExportOutput");
	await expect(outputArea).toBeVisible({ timeout: 10_000 });
	await expect(async () => {
		const val = await outputArea.inputValue();
		expect(val.length).toBeGreaterThan(100);
	}).toPass({ timeout: 10_000 });

	const exportedText = await outputArea.inputValue();
	expect(exportedText).toContain("seeded backup memo");

	// Modify the export string: "seeded backup memo" → "restored backup memo"
	const modifiedBackup = exportedText.replaceAll("seeded backup memo", "restored backup memo");

	// Close export view
	await page.getByRole("button", { name: "Close" }).click();

	// Click "Import data"
	await page.getByRole("button", { name: "Import data" }).click();
	await expect(outputArea).toBeVisible();

	// Fill the textarea with the modified backup payload
	await outputArea.fill(modifiedBackup);

	// Submit the restore
	await page.getByTitle("Import data").click();

	// Wait for the reload prompt or success message
	await expect(outputArea).toHaveValue(/Reload (your )?page|Carregar novamente|Recargar página/, {
		timeout: 15_000,
	});

	// Reload the page to load restored state
	await page.reload();

	// Unlock with the seeded passphrase
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({ timeout: 10_000 });
	await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
	await page.getByRole("button", { name: "Unlock" }).click();

	// Verify the restored data shows "restored backup memo"
	await OpenMenuItem(page, "All transactions");
	await expect(page.locator(".transactionTable-body")).toBeVisible();
	await expect(
		page.locator('input[data-testid="editorMemo"][value="restored backup memo"]'),
	).toBeVisible({ timeout: 10_000 });
});
