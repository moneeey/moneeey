import { type Page, expect } from "@playwright/test";
import { Input } from "./page-objects";
import { E2E_PASSPHRASE } from "./wizard";

export async function landThroughLanguage(page: Page) {
	await page.getByTestId("languageSelector_en").click();
	await page.getByTestId("ok-button").click();
}

export async function signupViaPasskey(page: Page, email: string) {
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

export async function pickDefaultCurrencyBRL(page: Page) {
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible({
		timeout: 15_000,
	});
	await page.getByTestId("defaultCurrencySelector").click();
	await page.getByText("BRL Brazilian Real").click();
	await page.getByRole("button", { name: "Continue to Moneeey" }).click();
}

export async function createFirstAccount(page: Page, name: string) {
	await expect(page.getByTestId("name")).toBeVisible({ timeout: 15_000 });
	await Input(page, "name").change(name);
	await expect(page.getByTestId("save-and-close")).toBeEnabled({
		timeout: 5_000,
	});
	await page.getByTestId("save-and-close").click();
	await dismissLandingTour(page);
}

export async function dismissLandingTour(page: Page) {
	const close = page.getByTestId("nm-modal-card").getByTestId("close");
	try {
		await close.waitFor({ state: "visible", timeout: 10_000 });
		await close.click();
		await expect(close).not.toBeVisible({ timeout: 5_000 });
	} catch {
		/* tour modal didn't appear — first-run flag already set */
	}
}

export async function openAccountSettings(page: Page) {
	await page.evaluate(() => {
		window.location.hash = "/settings/accounts";
	});
	await expect(page.getByTestId("addAccount")).toBeVisible({
		timeout: 15_000,
	});
}

export async function addAccountFromSettings(page: Page, name: string) {
	await page.getByTestId("addAccount").click();
	await expect(page.getByTestId("name")).toBeVisible({ timeout: 15_000 });
	await Input(page, "name").change(name);
	await expect(page.getByTestId("save-and-close")).toBeEnabled({
		timeout: 5_000,
	});
	await page.getByTestId("save-and-close").click();
}

export const BACKEND_REACHABLE = async (baseURL: string): Promise<boolean> => {
	try {
		const response = await fetch(`${baseURL.replace(/\/$/, "")}/api/`);
		return response.ok;
	} catch {
		return false;
	}
};
