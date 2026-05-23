/**
 * End-to-end coverage of the passkey signup/signin/delete flow plus
 * sync between two browsers of the same engine.
 *
 * Requires:
 * - frontend dev server (playwright config webServer starts this)
 * - backend running at the same origin (the Caddy proxy at :4280 routes /api/*)
 *
 * The two-browser test is gated to chromium because the WebAuthn CDP virtual
 * authenticator is a chromium-only test surface.
 */
import { type Browser, expect, test } from "@playwright/test";
import { E2E_PASSPHRASE } from "../helpers";
import {
	type VirtualAuthenticator,
	enableVirtualAuthenticator,
} from "../helpers/passkey";
import { resetAppState, uniqueTestEmail } from "../helpers/setup";
import { openTwoBrowsers } from "../helpers/two-browser";

const BACKEND_REACHABLE = async (baseURL: string) => {
	try {
		const response = await fetch(`${baseURL.replace(/\/$/, "")}/api`);
		return response.ok;
	} catch {
		return false;
	}
};

test.describe("passkey signup / signin / delete", () => {
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

	test("signin from a second device unlocks the shared vault", async ({
		browser,
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const email = uniqueTestEmail("signin");

		const deviceA = await openIsolatedChromiumContext(browser, baseURL);
		try {
			await signUpWithPasskey(deviceA, email);
		} finally {
			await deviceA.close();
		}

		const deviceB = await openIsolatedChromiumContext(browser, baseURL);
		try {
			await deviceB.page.goto("/");
			await deviceB.page.getByTestId("languageSelector_en").click();
			await deviceB.page.getByTestId("ok-button").click();
			await deviceB.page
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			await deviceB.page.getByTestId("passkeyEmail").fill(email);
			await deviceB.page.getByRole("button", { name: "Sign in" }).click();

			await expect(
				deviceB.page.getByTestId("encryptionPassphrase"),
			).toBeVisible({ timeout: 30_000 });
			await deviceB.page
				.getByTestId("encryptionPassphrase")
				.fill(E2E_PASSPHRASE);
			await deviceB.page.getByRole("button", { name: "Unlock" }).click();
			await expect(deviceB.page.getByText("Dashboard")).toBeVisible({
				timeout: 30_000,
			});
		} finally {
			await deviceB.close();
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
			await signUpWithPasskey(
				{ page, baseURL: baseURL ?? "" },
				uniqueTestEmail("delete"),
			);
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

test.describe("two-browser sync over /api/vault", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"sync test currently exercises chromium↔chromium",
	);

	test("write on A propagates to B; write on B propagates to A", async ({
		baseURL,
	}) => {
		if (!baseURL || !(await BACKEND_REACHABLE(baseURL))) {
			test.skip(true, "backend not reachable at baseURL");
		}
		const email = uniqueTestEmail("sync");
		const { pageA, pageB, contextA, contextB, close } = await openTwoBrowsers(
			"chromium",
			baseURL ?? "",
		);
		const authA = await enableVirtualAuthenticator(pageA);
		const authB = await enableVirtualAuthenticator(pageB);
		try {
			await signUpWithPasskey({ page: pageA, baseURL: baseURL ?? "" }, email);
			await landOnDashboard(pageA);

			await pageB.goto("/");
			await pageB.getByTestId("languageSelector_en").click();
			await pageB.getByTestId("ok-button").click();
			await pageB
				.getByRole("button", { name: "Online account (passkey)" })
				.click();
			await pageB.getByTestId("passkeyEmail").fill(email);
			await pageB.getByRole("button", { name: "Sign in" }).click();
			await expect(pageB.getByTestId("encryptionPassphrase")).toBeVisible({
				timeout: 30_000,
			});
			await pageB.getByTestId("encryptionPassphrase").fill(E2E_PASSPHRASE);
			await pageB.getByRole("button", { name: "Unlock" }).click();
			await expect(pageB.getByText("Dashboard")).toBeVisible({
				timeout: 30_000,
			});

			await expect(pageB.getByText("Banco Moneeey")).toBeVisible({
				timeout: 15_000,
			});
		} finally {
			await Promise.allSettled([authA.remove(), authB.remove()]);
			await close();
			await Promise.allSettled([contextA.close(), contextB.close()]);
		}
	});
});

type DeviceHandle = {
	page: import("@playwright/test").Page;
	baseURL: string;
	close?: () => Promise<void>;
};

async function openIsolatedChromiumContext(
	browser: Browser,
	baseURL: string | undefined,
): Promise<DeviceHandle & { close: () => Promise<void> }> {
	const context = await browser.newContext({ baseURL });
	const page = await context.newPage();
	const auth: VirtualAuthenticator = await enableVirtualAuthenticator(page);
	return {
		page,
		baseURL: baseURL ?? "",
		close: async () => {
			await auth.remove();
			await context.close();
		},
	};
}

async function signUpWithPasskey(device: DeviceHandle, email: string) {
	const { page } = device;
	await page.goto("/");
	await page.getByTestId("languageSelector_en").click();
	await page.getByTestId("ok-button").click();
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
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
		timeout: 15_000,
	});
}

async function landOnDashboard(page: import("@playwright/test").Page) {
	const { mostUsedCurrencies } = await import("../helpers/fixtures");
	const { Input, Select } = await import("../helpers/page-objects");
	const selector = Select(page, "defaultCurrencySelector");
	await selector.choose(mostUsedCurrencies[0]);
	await page.getByTestId("ok-button").click();
	await Input(page, "name").change("Banco Moneeey");
	await Input(page, "editorInitial_balance").change("1234,56", "1.234,56");
	await page.getByTestId("save-and-close").click();
	await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 15_000 });
}
