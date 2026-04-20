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

test("Settings — language, theme, tour, and delete data cancel + confirm", async ({
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

	await test.step("tour button opens modal", async () => {
		await page.getByRole("button", { name: /tour/i }).click();
		await expect(page.getByTestId("nm-modal-card")).toBeVisible();
		await page.getByTestId("nm-modal-card").getByTestId("close").click();
	});

	await page.getByTestId("settingsTabs_data").click();

	await test.step("delete data — cancel leaves settings intact", async () => {
		await page.getByRole("button", { name: /delete data/i }).click();
		await expect(page.getByText(/permanently delete/i)).toBeVisible();
		await page.getByRole("button", { name: /cancel/i }).click();
		await expect(page.getByTestId("settingsTabs_data")).toBeVisible();
	});

	await test.step("delete data — confirm destroys database and returns to wizard", async () => {
		await page.getByRole("button", { name: /delete data/i }).click();
		await page
			.getByRole("button", { name: /delete data/i })
			.last()
			.click();
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
