import {
	Select,
	clickMenuByTestId,
	defaultSeedAccounts,
	expect,
	seedTestEnvironment,
	test,
} from "../helpers";

const CURRENCIES_MENU_TESTID = "appMenu_subitems_settings_settings_currencies";
const ACCOUNTS_MENU_TESTID = "appMenu_subitems_settings_settings_accounts";

test("Currency settings — view, edit existing currency, and add new currency", async ({
	seededPage: page,
}) => {
	await seedTestEnvironment(page, {
		accounts: defaultSeedAccounts,
	});

	// Navigate to Settings > Currencies
	await clickMenuByTestId(page, CURRENCIES_MENU_TESTID);

	// Wait for the currency table body to render
	const body = page.locator(".currencyTable-body");
	await expect(body).toBeVisible();

	// Edit an existing visible currency (row 0: Algerian Dinar)
	const firstPrefix = page.getByTestId("editorPrefix").first();
	await firstPrefix.click();
	await firstPrefix.fill("DA");
	await firstPrefix.blur();
	await expect(firstPrefix).toHaveValue("DA");

	// Scroll to the bottom of the virtualized currency table to expose the creatable row
	await body.evaluate((element) => {
		element.scrollTop = element.scrollHeight;
		element.dispatchEvent(new Event("scroll", { bubbles: true }));
	});

	// Fill custom currency name: "Monero" in the last visible editorName input
	const creatableName = page.getByTestId("editorName").last();
	await expect(creatableName).toHaveValue("");
	await creatableName.click();
	await creatableName.fill("Monero");
	await creatableName.blur();

	// Fill short code: "XMR" in the last visible editorShort input
	const creatableShort = page.getByTestId("editorShort").last();
	await creatableShort.click();
	await creatableShort.fill("XMR");
	await creatableShort.blur();

	// Navigate to Accounts and open Add Account modal
	await clickMenuByTestId(page, ACCOUNTS_MENU_TESTID);
	await page.getByTestId("addAccount").click();
	await expect(page.getByTestId("nm-modal-card")).toBeVisible();

	// Check that Monero is in the currency picker options inside the modal
	const modal = page.getByTestId("nm-modal-card");
	const currencySelect = Select(modal, "editorCurrency");
	const options = await currencySelect.options();
	expect(options.some((opt) => opt.includes("Monero") || opt.includes("XMR"))).toBe(true);

	// Close the dropdown and the modal
	await page.keyboard.press("Escape");
	await page.getByTestId("cancel-button").click();
	await expect(page.getByTestId("nm-modal-card")).not.toBeVisible();
});
