/**
 * End-to-end coverage of the passkey signup/delete flow on a single device.
 *
 * Cross-device flows aren't covered: CDP virtual authenticators don't share
 * credentials across browser contexts, so a "second device" can't assert
 * against the same credential. Real-world passkey sync (iCloud / Google PM)
 * isn't simulated here.
 *
 * Requires:
 * - frontend dev server (playwright config webServer starts this)
 * - backend running at the same origin (the Caddy proxy at :4280 routes /api/*)
 */
import { expect, test } from "@playwright/test";
import { E2E_PASSPHRASE } from "../helpers";
import { enableVirtualAuthenticator } from "../helpers/passkey";
import { resetAppState, uniqueTestEmail } from "../helpers/setup";

const BACKEND_REACHABLE = async (baseURL: string) => {
	try {
		const response = await fetch(`${baseURL.replace(/\/$/, "")}/api`);
		return response.ok;
	} catch {
		return false;
	}
};

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
			await page.getByTestId("languageSelector_en").click();
			await page.getByTestId("ok-button").click();
			await page
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			const email = uniqueTestEmail("signup");
			await page.getByTestId("passkeyEmail").fill(email);
			await page.getByRole("button", { name: "Sign up" }).click();

			await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await page
				.getByTestId("encryptionPassphraseConfirm")
				.fill(E2E_PASSPHRASE);
			await page
				.getByRole("button", { name: "Create passphrase and continue" })
				.click();

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
			await page.getByTestId("languageSelector_en").click();
			await page.getByTestId("ok-button").click();
			await page
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			await page.getByTestId("passkeyEmail").fill(uniqueTestEmail("delete"));
			await page.getByRole("button", { name: "Sign up" }).click();
			await expect(page.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await page.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await page
				.getByTestId("encryptionPassphraseConfirm")
				.fill(E2E_PASSPHRASE);
			await page
				.getByRole("button", { name: "Create passphrase and continue" })
				.click();
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
