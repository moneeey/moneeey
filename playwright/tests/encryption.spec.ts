import {
	E2E_PASSPHRASE,
	clickMenuByTestId,
	completeEncryptionSetup,
	expect,
	test,
	unlockWithPassphrase,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";

async function pickLanguageEn(page: import("@playwright/test").Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");
	await page.getByTestId("ok-button").click();
}

test.describe("Encryption gate", () => {
	test("setup flow: three-way chooser → create new → advances to currency picker", async ({
		seededPage: page,
	}) => {
		await pickLanguageEn(page);

		await expect(
			page.getByRole("button", { name: "Create new (local only)" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Online account (passkey)" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: "Sign in with self-hosted CouchDB",
			}),
		).toBeVisible();

		await completeEncryptionSetup(page);

		await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();

		const hasMeta = await page.evaluate(async () => {
			const dbs = await window.indexedDB.databases?.();
			return Boolean(dbs?.find((d) => d.name === "_pouch_moneeey"));
		});
		expect(hasMeta).toBe(true);
	});

	test("rejects a passphrase shorter than 8 characters", async ({
		seededPage: page,
	}) => {
		await pickLanguageEn(page);
		await page.getByRole("button", { name: "Create new (local only)" }).click();

		await page.getByTestId("encryptionPassphrase").fill("short");
		await page.getByTestId("encryptionPassphraseConfirm").fill("short");
		await page
			.getByRole("button", { name: "Create passphrase and continue" })
			.click();

		await expect(page.getByTestId("encryptionError")).toContainText(
			"at least 8",
		);
		await expect(page.getByTestId("defaultCurrencySelector")).not.toBeVisible();
	});

	test("rejects mismatched confirmation", async ({ seededPage: page }) => {
		await pickLanguageEn(page);
		await page.getByRole("button", { name: "Create new (local only)" }).click();

		await page
			.getByTestId("encryptionPassphrase")
			.fill("first-long-enough-123");
		await page
			.getByTestId("encryptionPassphraseConfirm")
			.fill("second-long-enough-456");
		await page
			.getByRole("button", { name: "Create passphrase and continue" })
			.click();

		await expect(page.getByTestId("encryptionError")).toContainText(
			"do not match",
		);
		await expect(page.getByTestId("defaultCurrencySelector")).not.toBeVisible();
	});

	test("unlock after reload requires the same passphrase", async ({
		seededPage: page,
	}) => {
		await pickLanguageEn(page);
		await completeEncryptionSetup(page);

		await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();

		await page.reload();

		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
		await expect(page.getByTestId("encryptionPassphraseConfirm")).toHaveCount(
			0,
		);

		await page
			.getByTestId("encryptionPassphrase")
			.fill("totally-wrong-passphrase");
		await page.getByRole("button", { name: "Unlock" }).click();
		await expect(page.getByTestId("encryptionError")).toContainText(
			"Wrong passphrase",
		);

		await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
		await page.getByRole("button", { name: "Unlock" }).click();
		await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();
	});

	test("Lock menu entry returns to the unlock screen", async ({
		wizardPage: page,
	}) => {
		await clickMenuByTestId(page, "appMenu_lock");

		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
		await expect(page.getByTestId("encryptionPassphraseConfirm")).toHaveCount(
			0,
		);

		await unlockWithPassphrase(page);

		await expect(page.getByText("Dashboard")).toBeVisible();
	});

	test("Change passphrase re-encrypts and re-locks the app", async ({
		wizardPage: page,
	}) => {
		await clickMenuByTestId(page, SETTINGS_MENU_TESTID);

		await page.getByRole("button", { name: "Change passphrase" }).click();

		const newPass = "new-playwright-pass-789";
		await page.getByTestId("currentPassphrase").fill(E2E_PASSPHRASE);
		await page.getByTestId("newPassphrase").fill(newPass);
		await page.getByTestId("newPassphraseConfirm").fill(newPass);
		await page.getByRole("button", { name: "Re-encrypt and reload" }).click();

		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();

		await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
		await page.getByRole("button", { name: "Unlock" }).click();
		await expect(page.getByTestId("encryptionError")).toContainText(
			"Wrong passphrase",
		);

		await page.getByTestId("encryptionPassphrase").fill(newPass);
		await page.getByRole("button", { name: "Unlock" }).click();
		await expect(page.getByText("Dashboard")).toBeVisible();
	});
});
