import {
	E2E_PASSPHRASE,
	defaultSeedAccounts,
	expect,
	seedTestEnvironment,
	test,
} from "../helpers";

test.describe("Privacy Mode", () => {
	test("Header eye button toggles privacy mode, masks numbers, and persists across reload", async ({
		seededPage: page,
	}) => {
		await seedTestEnvironment(page, {
			accounts: [
				...defaultSeedAccounts,
				{ id: "test-payee-bakery", name: "Bakery123", kind: "PAYEE" },
			],
			transactions: [
				{
					id: "test-transaction-privacy-test",
					from: "MoneeeyCard",
					to: "Bakery123",
					amount: 50,
					memo: "bread",
				},
			],
		});

		const toggleBtn = page.getByTestId("privacyModeToggle");
		await expect(toggleBtn).toBeVisible();

		const navBalance = page.getByTestId("accountRunningBalance").first();
		await expect(navBalance).toBeVisible();
		await expect(navBalance).not.toHaveClass(/blur-xs/);

		const txAmount = page.getByTestId("editorAmount").first();
		await expect(txAmount).toBeVisible();
		await expect(txAmount).not.toHaveClass(/blur-xs/);

		const kpiTotalChange = page.getByTestId("kpiTotalChange");
		await expect(kpiTotalChange).toBeVisible();
		const kpiValue = kpiTotalChange.locator("[data-privacy-blur]");
		await expect(kpiValue).toBeVisible();
		await expect(kpiValue).not.toHaveClass(/blur-xs/);

		// 1. Click eye button to enable privacy mode
		await toggleBtn.click();

		// Numbers are blurred across tables, summary cards, and navigation items
		await expect(navBalance).toHaveClass(/blur-xs/);
		await expect(txAmount).toHaveClass(/blur-xs/);
		await expect(kpiValue).toHaveClass(/blur-xs/);

		// Check localStorage persistence
		const storedValue = await page.evaluate(() =>
			window.localStorage.getItem("privacy_mode"),
		);
		expect(storedValue).toBe("true");

		// 2. Persists across page reload
		await page.reload();
		await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
		await page.getByRole("button", { name: "Unlock" }).click();

		await expect(page.getByTestId("privacyModeToggle")).toBeVisible();

		const navBalanceReloaded = page
			.getByTestId("accountRunningBalance")
			.first();
		await expect(navBalanceReloaded).toBeVisible();
		await expect(navBalanceReloaded).toHaveClass(/blur-xs/);

		const txAmountReloaded = page.getByTestId("editorAmount").first();
		await expect(txAmountReloaded).toBeVisible();
		await expect(txAmountReloaded).toHaveClass(/blur-xs/);

		const kpiReloaded = page
			.getByTestId("kpiTotalChange")
			.locator("[data-privacy-blur]");
		await expect(kpiReloaded).toBeVisible();
		await expect(kpiReloaded).toHaveClass(/blur-xs/);

		// 3. Global shortcut toggles privacy mode off and on
		await page.keyboard.press("Control+Shift+P");
		await expect(navBalanceReloaded).not.toHaveClass(/blur-xs/);
		await expect(txAmountReloaded).not.toHaveClass(/blur-xs/);
		await expect(kpiReloaded).not.toHaveClass(/blur-xs/);

		const storedAfterShortcut = await page.evaluate(() =>
			window.localStorage.getItem("privacy_mode"),
		);
		expect(storedAfterShortcut).toBe("false");

		await page.keyboard.press("Control+Shift+P");
		await expect(navBalanceReloaded).toHaveClass(/blur-xs/);
		await expect(txAmountReloaded).toHaveClass(/blur-xs/);
		await expect(kpiReloaded).toHaveClass(/blur-xs/);

		// 4. Toggle back off via header button
		await page.getByTestId("privacyModeToggle").click();
		await expect(navBalanceReloaded).not.toHaveClass(/blur-xs/);
		await expect(txAmountReloaded).not.toHaveClass(/blur-xs/);
		await expect(kpiReloaded).not.toHaveClass(/blur-xs/);
	});
});
