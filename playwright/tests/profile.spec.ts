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

test("Profile tab — language, theme, tour, delete data cancel flow", async ({
	wizardPage: page,
}) => {
	await clickMenuByTestId(page, SETTINGS_MENU_TESTID);
	await page.getByTestId("settingsTabs_profile").click();

	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
	await expect(page.getByTestId("languageSelector_pt")).toBeVisible();
	await expect(page.getByTestId("themeSwitcher_light")).toBeVisible();
	await expect(page.getByTestId("themeSwitcher_dark")).toBeVisible();
	await expect(page.getByTestId("themeSwitcher_auto")).toBeVisible();

	await page.getByTestId("languageSelector_pt").click();
	await expect(page.getByTestId("settingsTabs_profile")).toContainText(
		"Perfil",
	);
	await page.getByTestId("languageSelector_en").click();

	await page.getByRole("button", { name: /tour/i }).click();
	await expect(page.getByTestId("nm-modal-card")).toBeVisible();
	await page.getByTestId("nm-modal-card").getByTestId("close").click();

	await page.getByRole("button", { name: /delete data/i }).click();
	await expect(page.getByText(/permanently delete/i)).toBeVisible();
	await page.getByRole("button", { name: /cancel/i }).click();
	await expect(page.getByTestId("settingsTabs_profile")).toBeVisible();
});

test("Profile tab — delete data confirmation destroys database", async ({
	wizardPage: page,
}) => {
	await clickMenuByTestId(page, SETTINGS_MENU_TESTID);
	await page.getByTestId("settingsTabs_profile").click();

	await page.getByRole("button", { name: /delete data/i }).click();
	await page
		.getByRole("button", { name: /delete data/i })
		.last()
		.click();

	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
});

test("Menu footer — sync status navigates to settings, lock returns to unlock", async ({
	wizardPage: page,
}) => {
	await clickMenuByTestId(page, "appMenu_sync_status");
	await expect(page.getByTestId("settingsTabs_profile")).toBeVisible();

	await clickMenuByTestId(page, "appMenu_lock");
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();
});

test("Unlock screen — delete data with cancel and confirm", async ({
	seededPage: page,
}) => {
	await pickLanguageEn(page);
	await completeEncryptionSetup(page);
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();

	await page.reload();
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();

	await page.getByRole("button", { name: /delete data/i }).click();
	await expect(page.getByText(/permanently delete/i)).toBeVisible();
	await page.getByRole("button", { name: /cancel/i }).click();
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible();

	await page.getByRole("button", { name: /delete data/i }).click();
	await page
		.getByRole("button", { name: /delete data/i })
		.last()
		.click();

	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
});
