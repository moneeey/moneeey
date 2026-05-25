/**
 * End-to-end coverage of the passkey signup/delete flow, plus cross-context
 * sync tests that bridge a CDP virtual-authenticator credential from one
 * browser context into another so a "second device" can log in with the same
 * passkey and observe synced state. Includes bidirectional account-sync
 * assertions and a logout-login regression for the ENCRYPTION-META sync path.
 *
 * Cross-engine flows aren't covered: virtual-authenticator credential bridging
 * is a Chromium DevTools Protocol feature. Real-world passkey sync
 * (iCloud / Google PM / KeePassXC) isn't simulated here.
 *
 * Requires:
 * - frontend dev server (playwright config webServer starts this)
 * - backend running at the same origin (the Caddy proxy at :4280 routes /api/*)
 */
import { type Page, expect, test } from "@playwright/test";
import { E2E_PASSPHRASE } from "../helpers";
import {
	enableVirtualAuthenticator,
	exportCredentials,
	importCredentials,
} from "../helpers/passkey";
import {
	BACKEND_REACHABLE,
	addAccountFromSettings,
	createFirstAccount,
	dismissLandingTour,
	landThroughLanguage,
	openAccountSettings,
	pickDefaultCurrencyBRL,
	signupViaPasskey,
} from "../helpers/passkey-flows";
import { resetAppState, uniqueTestDisplayName } from "../helpers/setup";

test.describe("passkey signup / delete", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator is chromium-only",
	);

	test("signup with passkey lands on dashboard", async ({ page, baseURL }) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		try {
			await resetAppState(page);
			await landThroughLanguage(page);
			await signupViaPasskey(page, uniqueTestDisplayName("signup"));
			await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
				timeout: 15_000,
			});
		} finally {
			await auth.remove();
		}
	});

	test("sign out wipes local data and returns to landing", async ({
		page,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		try {
			await page.goto("/");
			await landThroughLanguage(page);
			await signupViaPasskey(page, uniqueTestDisplayName("signout"));
			await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
				timeout: 15_000,
			});
			await page.reload();
			await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 15_000,
			});
			await page.getByTestId("signout").click();
			await page.getByTestId("signout-confirm").click();
			await expect(page.getByTestId("languageSelector_en")).toBeVisible({
				timeout: 15_000,
			});
		} finally {
			await auth.remove();
		}
	});
});

test.describe("passkey cross-context sync", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"credential bridging uses Chrome DevTools Protocol",
	);

	test("invite flow: A invites, B joins, bidirectional account sync", async ({
		browser,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}

		const contextA = await browser.newContext({ baseURL });
		const contextB = await browser.newContext({ baseURL });
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		const emailA = uniqueTestDisplayName("inviteA");
		const emailB = uniqueTestDisplayName("inviteB");
		const accountFromA = `AccountFromA-${Date.now()}`;
		const accountFromB = `AccountFromB-${Date.now()}`;

		try {
			await resetAppState(pageA);
			await landThroughLanguage(pageA);
			await signupViaPasskey(pageA, emailA);
			await pickDefaultCurrencyBRL(pageA);
			await createFirstAccount(pageA, accountFromA);
			await openAccountSettings(pageA);
			await expect(pageA.getByText(accountFromA)).toBeVisible({
				timeout: 15_000,
			});

			const inviteUrl = await pageA.evaluate(async () => {
				const res = await fetch("/api/auth/passkey/invite/create", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: "{}",
				});
				if (!res.ok) throw new Error(`invite/create failed: ${res.status}`);
				const json = (await res.json()) as { inviteUrl: string };
				return json.inviteUrl;
			});
			const hashMatch = inviteUrl.match(/#\/invite\/[a-z0-9.]+/);
			if (!hashMatch) throw new Error("invite URL missing hash");
			await pageB.goto(`/${hashMatch[0]}`);
			await landThroughLanguage(pageB);

			await expect(pageB.getByTestId("displayName")).toBeVisible({
				timeout: 15_000,
			});
			await pageB.getByTestId("displayName").fill(emailB);
			await pageB.getByRole("button", { name: "Join with passkey" }).click();

			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await expect(
				pageB.getByTestId("encryptionPassphraseConfirm"),
			).toHaveCount(0);
			await pageB.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageB.getByRole("button", { name: "Unlock" }).click();
			await dismissLandingTour(pageB);

			const hashAfter = await pageB.evaluate(() => window.location.hash);
			expect(hashAfter).not.toMatch(/^#\/invite\//);

			await openAccountSettings(pageB);
			await expect(pageB.getByText(accountFromA)).toBeVisible({
				timeout: 30_000,
			});

			await addAccountFromSettings(pageB, accountFromB);

			await expect(pageA.getByText(accountFromB)).toBeVisible({
				timeout: 30_000,
			});
		} finally {
			await authA.remove();
			await authB.remove();
			await contextA.close();
			await contextB.close();
		}
	});

	test("login flow: register on A, login on B with bridged passkey, bidirectional account sync", async ({
		browser,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}

		const contextA = await browser.newContext({ baseURL });
		const contextB = await browser.newContext({ baseURL });
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		const email = uniqueTestDisplayName("login");
		const accountFromA = `AccountFromA-${Date.now()}`;
		const accountFromB = `AccountFromB-${Date.now()}`;

		try {
			await resetAppState(pageA);
			await landThroughLanguage(pageA);
			await signupViaPasskey(pageA, email);
			await pickDefaultCurrencyBRL(pageA);
			await createFirstAccount(pageA, accountFromA);
			await openAccountSettings(pageA);
			await expect(pageA.getByText(accountFromA)).toBeVisible({
				timeout: 15_000,
			});

			const credentials = await exportCredentials(authA);
			expect(credentials.length).toBeGreaterThan(0);
			await importCredentials(authB, credentials);

			await resetAppState(pageB);
			await landThroughLanguage(pageB);
			await pageB
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			await pageB.getByRole("button", { name: "Sign in" }).click();

			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await expect(
				pageB.getByTestId("encryptionPassphraseConfirm"),
			).toHaveCount(0);
			await pageB.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageB.getByRole("button", { name: "Unlock" }).click();
			await dismissLandingTour(pageB);

			await openAccountSettings(pageB);
			await expect(pageB.getByText(accountFromA)).toBeVisible({
				timeout: 30_000,
			});

			await addAccountFromSettings(pageB, accountFromB);

			await expect(pageA.getByText(accountFromB)).toBeVisible({
				timeout: 30_000,
			});
		} finally {
			await authA.remove();
			await authB.remove();
			await contextA.close();
			await contextB.close();
		}
	});
});

async function openSyncSettings(page: Page) {
	await page.evaluate(() => {
		window.location.hash = "/settings";
	});
	await expect(page.getByTestId("settingsTabs_moneeey")).toBeVisible({
		timeout: 15_000,
	});
	await page.getByTestId("settingsTabs_moneeey").click();
}

test.describe("vault membership management", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"credential bridging uses Chrome DevTools Protocol",
	);

	test("owner can see members and kick a joined invitee", async ({
		browser,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}

		const contextA = await browser.newContext({ baseURL });
		const contextB = await browser.newContext({ baseURL });
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		const emailA = uniqueTestDisplayName("kickA");
		const emailB = uniqueTestDisplayName("kickB");
		const accountFromA = `KickAcc-${Date.now()}`;

		try {
			await resetAppState(pageA);
			await landThroughLanguage(pageA);
			await signupViaPasskey(pageA, emailA);
			await pickDefaultCurrencyBRL(pageA);
			await createFirstAccount(pageA, accountFromA);

			const inviteUrl = await pageA.evaluate(async () => {
				const res = await fetch("/api/auth/passkey/invite/create", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: "{}",
				});
				if (!res.ok) throw new Error(`invite/create failed: ${res.status}`);
				const json = (await res.json()) as { inviteUrl: string };
				return json.inviteUrl;
			});
			const hashMatch = inviteUrl.match(/#\/invite\/[a-z0-9.]+/);
			if (!hashMatch) throw new Error("invite URL missing hash");
			await pageB.goto(`/${hashMatch[0]}`);
			await landThroughLanguage(pageB);
			await expect(pageB.getByTestId("displayName")).toBeVisible({
				timeout: 15_000,
			});
			await pageB.getByTestId("displayName").fill(emailB);
			await pageB.getByRole("button", { name: "Join with passkey" }).click();
			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await pageB.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageB.getByRole("button", { name: "Unlock" }).click();
			await dismissLandingTour(pageB);

			await openSyncSettings(pageA);
			await expect(pageA.getByTestId("membersSection")).toBeVisible({
				timeout: 15_000,
			});
			await expect(pageA.getByTestId(`member-row-${emailB}`)).toBeVisible({
				timeout: 15_000,
			});
			await expect(pageA.getByTestId(`member-row-${emailA}`)).toBeVisible();

			await pageA.getByTestId(`kick-${emailB}`).click();
			await expect(pageA.getByTestId("confirm-kick")).toBeVisible();
			await pageA.getByTestId("confirm-kick-button").click();

			await expect(pageA.getByTestId(`member-row-${emailB}`)).toHaveCount(0, {
				timeout: 15_000,
			});

			await contextB.clearCookies();
			await resetAppState(pageB);
			await landThroughLanguage(pageB);
			await pageB
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			await pageB.getByRole("button", { name: "Sign in" }).click();
			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
		} finally {
			await authA.remove();
			await authB.remove();
			await contextA.close();
			await contextB.close();
		}
	});

	test("owner can transfer ownership to another member", async ({
		browser,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}

		const contextA = await browser.newContext({ baseURL });
		const contextB = await browser.newContext({ baseURL });
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		const emailA = uniqueTestDisplayName("xferA");
		const emailB = uniqueTestDisplayName("xferB");
		const accountFromA = `XferAcc-${Date.now()}`;

		try {
			await resetAppState(pageA);
			await landThroughLanguage(pageA);
			await signupViaPasskey(pageA, emailA);
			await pickDefaultCurrencyBRL(pageA);
			await createFirstAccount(pageA, accountFromA);

			const inviteUrl = await pageA.evaluate(async () => {
				const res = await fetch("/api/auth/passkey/invite/create", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: "{}",
				});
				if (!res.ok) throw new Error(`invite/create failed: ${res.status}`);
				const json = (await res.json()) as { inviteUrl: string };
				return json.inviteUrl;
			});
			const hashMatch = inviteUrl.match(/#\/invite\/[a-z0-9.]+/);
			if (!hashMatch) throw new Error("invite URL missing hash");
			await pageB.goto(`/${hashMatch[0]}`);
			await landThroughLanguage(pageB);
			await pageB.getByTestId("displayName").fill(emailB);
			await pageB.getByRole("button", { name: "Join with passkey" }).click();
			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await pageB.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageB.getByRole("button", { name: "Unlock" }).click();
			await dismissLandingTour(pageB);

			await openSyncSettings(pageA);
			await expect(pageA.getByTestId(`member-row-${emailB}`)).toBeVisible({
				timeout: 15_000,
			});

			await pageA.getByTestId(`transfer-${emailB}`).click();
			await expect(pageA.getByTestId("confirm-transfer")).toBeVisible();
			await pageA.getByTestId("confirm-transfer-button").click();

			await expect(pageA.getByTestId(`kick-${emailA}`)).toHaveCount(0, {
				timeout: 15_000,
			});

			await openSyncSettings(pageB);
			await expect(pageB.getByTestId(`kick-${emailA}`)).toBeVisible({
				timeout: 15_000,
			});
		} finally {
			await authA.remove();
			await authB.remove();
			await contextA.close();
			await contextB.close();
		}
	});
});

test.describe("sign out + sign back in", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator is chromium-only",
	);

	test("sign out from menu wipes local + cookie, sign back in restores from server", async ({
		page,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		const displayName = uniqueTestDisplayName("signoutLogin");
		const accountName = `AccountFromServer-${Date.now()}`;

		try {
			await resetAppState(page);
			await landThroughLanguage(page);
			await signupViaPasskey(page, displayName);
			await pickDefaultCurrencyBRL(page);
			await createFirstAccount(page, accountName);
			await openAccountSettings(page);
			await expect(page.getByText(accountName)).toBeVisible({
				timeout: 15_000,
			});
			await page.waitForTimeout(1500);

			await page.getByTestId("appMenu_signout").click();
			await expect(page.getByTestId("nm-modal-title")).toContainText(
				/sign out/i,
			);
			await page.getByTestId("signout-confirm").click();

			await expect(page.getByTestId("languageSelector_en")).toBeVisible({
				timeout: 30_000,
			});

			await landThroughLanguage(page);
			await page
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			await page.getByRole("button", { name: "Sign in" }).click();
			await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await expect(page.getByTestId("encryptionPassphraseConfirm")).toHaveCount(
				0,
				{ timeout: 5_000 },
			);

			await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await page.getByRole("button", { name: "Unlock" }).click();

			await openAccountSettings(page);
			await expect(page.getByText(accountName)).toBeVisible({
				timeout: 30_000,
			});
		} finally {
			await auth.remove();
		}
	});
});

async function createInviteUrl(page: Page): Promise<string> {
	return await page.evaluate(async () => {
		const res = await fetch("/api/auth/passkey/invite/create", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: "{}",
		});
		if (!res.ok) throw new Error(`invite/create failed: ${res.status}`);
		const json = (await res.json()) as { inviteUrl: string };
		return json.inviteUrl;
	});
}

async function ownerVaultId(page: Page): Promise<string> {
	return await page.evaluate(async () => {
		const res = await fetch("/api/auth/vaults/list", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});
		const json = (await res.json()) as {
			vaults: { vaultId: string; role: string }[];
		};
		return json.vaults.find((v) => v.role === "owner")?.vaultId ?? "";
	});
}

test.describe("existing user joins another vault via invite", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator is chromium-only",
	);

	test("logged-in user opens invite link, accepts, and sees both vaults", async ({
		browser,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}

		const contextA = await browser.newContext({ baseURL });
		const contextB = await browser.newContext({ baseURL });
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		const emailA = uniqueTestDisplayName("joinA");
		const emailB = uniqueTestDisplayName("joinB");
		const accountFromA = `JoinAccA-${Date.now()}`;
		const accountFromB = `JoinAccB-${Date.now()}`;

		try {
			await resetAppState(pageA);
			await landThroughLanguage(pageA);
			await signupViaPasskey(pageA, emailA);
			await pickDefaultCurrencyBRL(pageA);
			await createFirstAccount(pageA, accountFromA);
			const vaultIdA = await ownerVaultId(pageA);
			expect(vaultIdA).not.toBe("");

			await resetAppState(pageB);
			await landThroughLanguage(pageB);
			await signupViaPasskey(pageB, emailB);
			await pickDefaultCurrencyBRL(pageB);
			await createFirstAccount(pageB, accountFromB);
			const vaultIdB = await ownerVaultId(pageB);
			expect(vaultIdB).not.toBe("");
			expect(vaultIdB).not.toBe(vaultIdA);

			const inviteUrl = await createInviteUrl(pageA);
			const hashMatch = inviteUrl.match(/#\/invite\/([a-z0-9.]+)/);
			if (!hashMatch) throw new Error("invite URL missing hash");

			await openAccountSettings(pageB);
			await expect(pageB.getByText(accountFromB)).toBeVisible({
				timeout: 15_000,
			});
			await pageB.waitForTimeout(1500);

			await pageB.evaluate((h) => {
				window.location.hash = h.replace(/^#/, "");
			}, hashMatch[0]);
			await pageB.reload();

			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await expect(
				pageB.getByTestId("encryptionPassphraseConfirm"),
			).toHaveCount(0);
			await pageB.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageB.getByRole("button", { name: "Unlock" }).click();

			await expect(pageB.getByTestId("joinVaultAccept")).toBeVisible({
				timeout: 30_000,
			});
			await pageB.getByTestId("joinVaultAccept").click();

			await expect(pageB.getByTestId("joinVaultDone")).toBeVisible({
				timeout: 15_000,
			});
			await pageB.getByTestId("joinVaultDone").click();

			await expect(pageB).toHaveURL(/#\/dashboard$/, { timeout: 15_000 });
			await openSyncSettings(pageB);

			await expect(pageB.getByTestId("vaultSwitcherSection")).toBeVisible({
				timeout: 15_000,
			});
			await expect(pageB.getByTestId(`vault-${vaultIdA}`)).toBeVisible({
				timeout: 15_000,
			});
			await expect(pageB.getByTestId(`vault-${vaultIdB}`)).toBeVisible();
		} finally {
			await authA.remove();
			await authB.remove();
			await contextA.close();
			await contextB.close();
		}
	});
});

test.describe("vault create / delete", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator is chromium-only",
	);

	test("owner can create a new vault from settings", async ({
		page,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		try {
			await resetAppState(page);
			await landThroughLanguage(page);
			await signupViaPasskey(page, uniqueTestDisplayName("createVault"));
			await pickDefaultCurrencyBRL(page);
			await createFirstAccount(page, `Acc-${Date.now()}`);

			await openSyncSettings(page);
			await expect(page.getByTestId("vaultSwitcherSection")).toBeVisible({
				timeout: 15_000,
			});

			const newName = `Family-${Date.now()}`;
			await page.getByTestId("vault-create").click();
			await page.getByTestId("vault-create-input").fill(newName);
			await page.getByTestId("vault-create-confirm").click();

			await expect(page.getByText(newName)).toBeVisible({ timeout: 15_000 });
		} finally {
			await auth.remove();
		}
	});

	test("owner can delete a non-current vault when another remains", async ({
		page,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		try {
			await resetAppState(page);
			await landThroughLanguage(page);
			await signupViaPasskey(page, uniqueTestDisplayName("deleteVault"));
			await pickDefaultCurrencyBRL(page);
			await createFirstAccount(page, `Acc-${Date.now()}`);

			await openSyncSettings(page);

			await expect(page.locator('[data-testid^="vault-delete-"]')).toHaveCount(
				0,
			);

			const secondName = `ToDelete-${Date.now()}`;
			await page.getByTestId("vault-create").click();
			await page.getByTestId("vault-create-input").fill(secondName);
			await page.getByTestId("vault-create-confirm").click();
			await expect(page.getByText(secondName)).toBeVisible({ timeout: 15_000 });

			const row = page
				.getByTestId("vaultSwitcherSection")
				.locator(`li:has-text("${secondName}")`);
			await row.getByTestId(/^vault-delete-/).click();

			await expect(page.getByTestId("confirm-vault-delete")).toBeVisible();
			await page.getByTestId("confirm-vault-delete-button").click();

			await expect(page.getByText(secondName)).toHaveCount(0, {
				timeout: 15_000,
			});
		} finally {
			await auth.remove();
		}
	});
});

test.describe("vault IndexedDB isolation", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator is chromium-only",
	);

	test("switching to a new vault opens a fresh DB (no data poisoning)", async ({
		page,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		try {
			await resetAppState(page);
			await landThroughLanguage(page);
			await signupViaPasskey(page, uniqueTestDisplayName("isolation"));
			await pickDefaultCurrencyBRL(page);
			await createFirstAccount(page, `AccA-${Date.now()}`);

			await openSyncSettings(page);

			const secondName = `Second-${Date.now()}`;
			await page.getByTestId("vault-create").click();
			await page.getByTestId("vault-create-input").fill(secondName);
			await page.getByTestId("vault-create-confirm").click();
			const secondRow = page
				.getByTestId("vaultSwitcherSection")
				.locator(`li:has-text("${secondName}")`);
			await secondRow.getByTestId(/^select-vault-/).click();

			await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await expect(
				page.getByTestId("encryptionPassphraseConfirm"),
			).toBeVisible();
		} finally {
			await auth.remove();
		}
	});
});
