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
import { Input } from "../helpers/page-objects";
import {
	enableVirtualAuthenticator,
	exportCredentials,
	importCredentials,
} from "../helpers/passkey";
import { resetAppState, uniqueTestEmail } from "../helpers/setup";

const BACKEND_REACHABLE = async (baseURL: string) => {
	try {
		const response = await fetch(`${baseURL.replace(/\/$/, "")}/api`);
		return response.ok;
	} catch {
		return false;
	}
};

async function landThroughLanguage(page: Page) {
	await page.getByTestId("languageSelector_en").click();
	await page.getByTestId("ok-button").click();
}

async function signupViaPasskey(page: Page, email: string) {
	await page.getByRole("button", { name: "Online account (passkey)" }).click();
	await page.getByTestId("passkeyEmail").fill(email);
	await page.getByRole("button", { name: "Sign up" }).click();
	await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
		timeout: 30_000,
	});
	await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
	await page.getByTestId("encryptionPassphraseConfirm").fill(E2E_PASSPHRASE);
	await page
		.getByRole("button", { name: "Create passphrase and continue" })
		.click();
}

async function pickDefaultCurrencyBRL(page: Page) {
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
		timeout: 15_000,
	});
	await page.getByTestId("defaultCurrencySelector").click();
	await page.getByText("BRL Brazilian Real").click();
	await page.getByRole("button", { name: "Continue to Moneeey" }).click();
}

async function createFirstAccount(page: Page, name: string) {
	await expect(page.getByTestId("name")).toBeVisible({ timeout: 15_000 });
	await Input(page, "name").change(name);
	await expect(page.getByTestId("save-and-close")).toBeEnabled({
		timeout: 5_000,
	});
	await page.getByTestId("save-and-close").click();
	await dismissLandingTour(page);
}

async function dismissLandingTour(page: Page) {
	const close = page.getByTestId("nm-modal-card").getByTestId("close");
	try {
		await close.waitFor({ state: "visible", timeout: 10_000 });
		await close.click();
		await expect(close).not.toBeVisible({ timeout: 5_000 });
	} catch {
		/* tour modal didn't appear — first-run flag already set */
	}
}

async function openAccountSettings(page: Page) {
	await page.evaluate(() => {
		window.location.hash = "/settings/accounts";
	});
	await expect(page.getByTestId("addAccount")).toBeVisible({
		timeout: 15_000,
	});
}

async function addAccountFromSettings(page: Page, name: string) {
	await page.getByTestId("addAccount").click();
	await expect(page.getByTestId("name")).toBeVisible({ timeout: 15_000 });
	await Input(page, "name").change(name);
	await expect(page.getByTestId("save-and-close")).toBeEnabled({
		timeout: 5_000,
	});
	await page.getByTestId("save-and-close").click();
}

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
			await signupViaPasskey(page, uniqueTestEmail("signup"));
			await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
				timeout: 15_000,
			});
		} finally {
			await auth.remove();
		}
	});

	test("delete data wipes local store and returns to landing", async ({
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
			await signupViaPasskey(page, uniqueTestEmail("delete"));
			await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
				timeout: 15_000,
			});
			await page.reload();
			await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 15_000,
			});
			await page
				.getByRole("button", { name: /Delete data|Apagar dados/i })
				.first()
				.click();
			await page
				.getByRole("button", { name: /Delete data|Apagar dados/i })
				.last()
				.click();
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
		const emailA = uniqueTestEmail("inviteA");
		const emailB = uniqueTestEmail("inviteB");
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
			const hashMatch = inviteUrl.match(/#\/invite\/[a-f0-9]+/);
			if (!hashMatch) throw new Error("invite URL missing hash");
			await pageB.goto(`/${hashMatch[0]}`);
			await landThroughLanguage(pageB);

			await expect(pageB.getByTestId("inviteEmail")).toBeVisible({
				timeout: 15_000,
			});
			await pageB.getByTestId("inviteEmail").fill(emailB);
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
		const email = uniqueTestEmail("login");
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
			await pageB.getByTestId("passkeyEmail").fill(email);
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
		const emailA = uniqueTestEmail("kickA");
		const emailB = uniqueTestEmail("kickB");
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
			const hashMatch = inviteUrl.match(/#\/invite\/[a-f0-9]+/);
			if (!hashMatch) throw new Error("invite URL missing hash");
			await pageB.goto(`/${hashMatch[0]}`);
			await landThroughLanguage(pageB);
			await expect(pageB.getByTestId("inviteEmail")).toBeVisible({
				timeout: 15_000,
			});
			await pageB.getByTestId("inviteEmail").fill(emailB);
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
		const emailA = uniqueTestEmail("xferA");
		const emailB = uniqueTestEmail("xferB");
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
			const hashMatch = inviteUrl.match(/#\/invite\/[a-f0-9]+/);
			if (!hashMatch) throw new Error("invite URL missing hash");
			await pageB.goto(`/${hashMatch[0]}`);
			await landThroughLanguage(pageB);
			await pageB.getByTestId("inviteEmail").fill(emailB);
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

test.describe("passkey logout-login regression", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator is chromium-only",
	);

	test("logout then reload shows unlock (not setup) and unlocks back to local data", async ({
		page,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const auth = await enableVirtualAuthenticator(page);
		const email = uniqueTestEmail("logoutLogin");
		const accountName = `AccountKept-${Date.now()}`;

		try {
			await resetAppState(page);
			await landThroughLanguage(page);
			await signupViaPasskey(page, email);
			await pickDefaultCurrencyBRL(page);
			await createFirstAccount(page, accountName);
			await openAccountSettings(page);
			await expect(page.getByText(accountName)).toBeVisible({
				timeout: 15_000,
			});

			await page.evaluate(() => {
				window.location.hash = "/settings";
			});
			await expect(page.getByTestId("settingsTabs_moneeey")).toBeVisible({
				timeout: 15_000,
			});
			await page.getByTestId("settingsTabs_moneeey").click();
			await page.getByRole("button", { name: "Logout" }).click();

			await page.reload();

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
