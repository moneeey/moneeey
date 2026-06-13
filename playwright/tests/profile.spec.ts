import {
	clickMenuByTestId,
	completeEncryptionSetup,
	expect,
	test,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";

async function pickLanguageEn(page: import("@playwright/test").Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");
	await page.getByTestId("ok-button").click();
}

test("Settings — language, theme, sign out cancel + confirm", async ({
	wizardPage: page,
}) => {
	await clickMenuByTestId(page, SETTINGS_MENU_TESTID);

	await test.step("language selectors and theme switcher are visible", async () => {
		await expect(page.getByTestId("languageSelector_en")).toBeVisible();
		await expect(page.getByTestId("languageSelector_pt")).toBeVisible();
		await expect(page.getByTestId("themeSwitcher_light")).toBeVisible();
		await expect(page.getByTestId("themeSwitcher_dark")).toBeVisible();
		await expect(page.getByTestId("themeSwitcher_auto")).toBeVisible();
	});

	await test.step("switching language re-translates settings UI", async () => {
		await page.getByTestId("languageSelector_pt").click();
		await expect(page.getByTestId("settingsTabs_data")).toContainText("Dados");
		await page.getByTestId("languageSelector_en").click();
	});

	await test.step("sign out — cancel leaves app intact", async () => {
		await page.getByTestId("appMenu_signout").click();
		await expect(
			page.getByRole("heading", { name: /sign out & delete/i }),
		).toBeVisible();
		await page.getByTestId("signout-cancel").click();
		await expect(page.getByTestId("appMenu_lock")).toBeVisible();
	});

	await test.step("sign out — confirm wipes local data and returns to wizard", async () => {
		await page.getByTestId("appMenu_signout").click();
		await page.getByTestId("signout-confirm").click();
		await expect(page.getByTestId("minimalScreenTitle")).toContainText(
			"Moneeey",
		);
		await expect(page.getByTestId("languageSelector_en")).toBeVisible();
	});
});

test("Menu footer — sync status navigates to settings, lock returns to unlock", async ({
	wizardPage: page,
}) => {
	await clickMenuByTestId(page, "appMenu_sync_status");
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();

	await clickMenuByTestId(page, "appMenu_lock");
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
});

test("Unlock screen — sign out with cancel and confirm", async ({
	seededPage: page,
}) => {
	await pickLanguageEn(page);
	await completeEncryptionSetup(page);
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();

	await page.reload();
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();

	await page.getByTestId("signout").click();
	await expect(page.getByText(/your local copy of this vault/i)).toBeVisible();
	await page.getByRole("button", { name: /cancel/i }).click();
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();

	await page.getByTestId("signout").click();
	await page.getByTestId("signout-confirm").click();

	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
});
