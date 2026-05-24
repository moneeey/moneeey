/**
 * PWA offline coverage:
 *
 * 1. signs up via passkey + waits for the service worker to activate
 * 2. adds an online transaction (baseline)
 * 3. context.setOffline(true) → reload → app boots from SW cache
 * 4. unlocks with the cached encryption metadata
 * 5. adds an offline transaction (queued locally, no push)
 * 6. context.setOffline(false) → SyncClient reconnects, drains pending
 * 7. bridges the passkey credential into a second context and confirms both
 *    transactions are visible (proves they round-tripped through the server)
 *
 * Chromium-only: WebAuthn virtual authenticator + CDP credential bridging.
 */
import { expect, test } from "@playwright/test";
import { E2E_PASSPHRASE } from "../helpers";
import { OpenMenuItem } from "../helpers/page-objects";
import {
	enableVirtualAuthenticator,
	exportCredentials,
	importCredentials,
} from "../helpers/passkey";
import {
	BACKEND_REACHABLE,
	createFirstAccount,
	dismissLandingTour,
	landThroughLanguage,
	pickDefaultCurrencyBRL,
	signupViaPasskey,
} from "../helpers/passkey-flows";
import { resetAppState, uniqueTestEmail } from "../helpers/setup";
import { updateOnAccountTransactions } from "../helpers/transactions";

const ONLINE_TIMEOUT = 60_000;

async function waitForSyncStatus(
	page: import("@playwright/test").Page,
	status: "online" | "offline" | "connecting",
	timeout = ONLINE_TIMEOUT,
) {
	await expect(page.getByTestId("appMenu_sync_status")).toHaveAttribute(
		"title",
		new RegExp(status, "i"),
		{ timeout },
	);
}

async function waitForServiceWorker(page: import("@playwright/test").Page) {
	await page.evaluate(async () => {
		const reg = await navigator.serviceWorker.ready;
		if (!reg.active) {
			await new Promise<void>((resolve) => {
				const sw = reg.installing ?? reg.waiting;
				if (!sw) {
					resolve();
					return;
				}
				sw.addEventListener("statechange", () => {
					if (sw.state === "activated") resolve();
				});
			});
		}
	});
}

test.describe("PWA offline", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"WebAuthn virtual authenticator + CDP credential bridging are chromium-only",
	);

	test("app works offline and syncs queued changes on reconnect", async ({
		browser,
		baseURL,
	}) => {
		test.setTimeout(180_000);
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}

		const contextA = await browser.newContext({ baseURL });
		const contextB = await browser.newContext({ baseURL });
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		const email = uniqueTestEmail("offline");
		const accountName = "Wallet";
		const onlineCounterpart = `OnlineSrc-${Date.now()}`;
		const offlineCounterpart = `OfflineSrc-${Date.now()}`;

		try {
			await resetAppState(pageA);
			await landThroughLanguage(pageA);
			await signupViaPasskey(pageA, email);
			await pickDefaultCurrencyBRL(pageA);
			await createFirstAccount(pageA, accountName);

			await waitForServiceWorker(pageA);
			await waitForSyncStatus(pageA, "online");

			await OpenMenuItem(pageA, `BRL ${accountName}`);
			await updateOnAccountTransactions(
				pageA,
				1,
				onlineCounterpart,
				"100,00",
				"online-tx",
				"100",
			);
			await pageA.waitForTimeout(1500);

			await contextA.setOffline(true);
			await pageA.reload();
			await expect(pageA.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await expect(
				pageA.getByTestId("encryptionPassphraseConfirm"),
			).toHaveCount(0);
			await pageA.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageA.getByRole("button", { name: "Unlock" }).click();
			await dismissLandingTour(pageA);

			await waitForSyncStatus(pageA, "offline");

			await OpenMenuItem(pageA, `BRL ${accountName}`);
			await expect(pageA.getByText(onlineCounterpart)).toBeVisible({
				timeout: 30_000,
			});

			await updateOnAccountTransactions(
				pageA,
				2,
				offlineCounterpart,
				"-50,00",
				"offline-tx",
				"-50",
			);
			await pageA.waitForTimeout(1500);

			await contextA.setOffline(false);
			await waitForSyncStatus(pageA, "online");
			await pageA.waitForTimeout(1500);

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
			await waitForSyncStatus(pageB, "online");

			await OpenMenuItem(pageB, `BRL ${accountName}`);
			await expect(pageB.getByText(onlineCounterpart)).toBeVisible({
				timeout: 30_000,
			});
			await expect(pageB.getByText(offlineCounterpart)).toBeVisible({
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
