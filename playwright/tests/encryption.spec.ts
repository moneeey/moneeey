import {
	E2E_PASSPHRASE,
	clickMenuByTestId,
	completeEncryptionSetup,
	expect,
	test,
	unlockWithPassphrase,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";

/**
 * From the freshly-reset LandingPage at `/`, pick English and click the
 * "Go to Moneeey" button. That navigates to /dashboard where the app boot
 * path renders the EncryptionGate (language is now set, no encrypted DB
 * exists yet, so it renders the setup form).
 */
async function pickLanguageEn(page: import("@playwright/test").Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");
	await page.getByTestId("ok-button").click();
}

test.describe("Encryption gate", () => {
	test("setup flow creates passphrase and advances to currency picker", async ({
		seededPage: page,
	}) => {
		await pickLanguageEn(page);

		// Encryption gate: setup mode (no prior flag in localStorage)
		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
		await expect(
			page.getByTestId("encryptionPassphraseConfirm"),
		).toBeVisible();

		await completeEncryptionSetup(page);

		// Next boot step = currency selection
		await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();

		// localStorage marker is now set
		const flag = await page.evaluate(() =>
			window.localStorage.getItem("moneeey.encryption.initialized"),
		);
		expect(flag).toBe("1");
	});

	test("rejects a passphrase shorter than 12 characters", async ({
		seededPage: page,
	}) => {
		await pickLanguageEn(page);

		await page.getByTestId("encryptionPassphrase").fill("short");
		await page.getByTestId("encryptionPassphraseConfirm").fill("short");
		await page.getByTestId("ok-button").click();

		await expect(page.getByTestId("encryptionError")).toContainText(
			"at least 12",
		);
		// Still on the gate
		await expect(
			page.getByTestId("defaultCurrencySelector"),
		).not.toBeVisible();
	});

	test("rejects mismatched confirmation", async ({ seededPage: page }) => {
		await pickLanguageEn(page);

		await page
			.getByTestId("encryptionPassphrase")
			.fill("first-long-enough-123");
		await page
			.getByTestId("encryptionPassphraseConfirm")
			.fill("second-long-enough-456");
		await page.getByTestId("ok-button").click();

		await expect(page.getByTestId("encryptionError")).toContainText(
			"do not match",
		);
		await expect(
			page.getByTestId("defaultCurrencySelector"),
		).not.toBeVisible();
	});

	test("unlock after reload requires the same passphrase", async ({
		seededPage: page,
	}) => {
		await pickLanguageEn(page);
		await completeEncryptionSetup(page);

		// Wait for the next gate (currency picker) so we know setup persisted
		// the Config doc into the encrypted mirror before we reload.
		await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();

		// Reload — language is preserved in localStorage, encrypted mirror
		// persists in IndexedDB, so we should land on the unlock screen.
		await page.reload();

		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
		await expect(
			page.getByTestId("encryptionPassphraseConfirm"),
		).toHaveCount(0);

		// Wrong passphrase first
		await page
			.getByTestId("encryptionPassphrase")
			.fill("totally-wrong-passphrase");
		await page.getByTestId("ok-button").click();
		await expect(page.getByTestId("encryptionError")).toContainText(
			"Wrong passphrase",
		);

		// Then the correct one
		await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
		await page.getByTestId("ok-button").click();
		await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();
	});

	test("Lock menu entry returns to the unlock screen", async ({
		wizardPage: page,
	}) => {
		// wizardPage completes the full landing flow (language → encryption
		// setup → currency → accounts), so we start on the dashboard with an
		// active encrypted database.
		await clickMenuByTestId(page, "appMenu_lock");

		// Lock triggers a full reload; language is remembered, encrypted
		// mirror is intact, so we should land back on unlock.
		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
		await expect(
			page.getByTestId("encryptionPassphraseConfirm"),
		).toHaveCount(0);

		await unlockWithPassphrase(page);

		// After unlock we should be back on the dashboard.
		await expect(page.getByText("Dashboard")).toBeVisible();
	});

	test("Change passphrase re-encrypts and re-locks the app", async ({
		wizardPage: page,
	}) => {
		// Open Settings → Preferences to reach the Change passphrase button.
		await clickMenuByTestId(page, SETTINGS_MENU_TESTID);

		await page.getByRole("button", { name: "Change passphrase" }).click();

		const newPass = "new-playwright-pass-789";
		await page.getByTestId("newPassphrase").fill(newPass);
		await page.getByTestId("newPassphraseConfirm").fill(newPass);
		await page.getByRole("button", { name: "Re-encrypt and reload" }).click();

		// changePassphrase reloads the tab when it finishes. After reload we
		// should be on the unlock screen.
		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();

		// Old passphrase should no longer work
		await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
		await page.getByTestId("ok-button").click();
		await expect(page.getByTestId("encryptionError")).toContainText(
			"Wrong passphrase",
		);

		// New one unlocks back into the app
		await page.getByTestId("encryptionPassphrase").fill(newPass);
		await page.getByTestId("ok-button").click();
		await expect(page.getByText("Dashboard")).toBeVisible();
	});
});
