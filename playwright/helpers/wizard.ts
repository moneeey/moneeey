import { type Page, expect } from "@playwright/test";
import { mostUsedCurrencies } from "./fixtures";
import { Input, Select } from "./page-objects";

/**
 * Walks through the full landing wizard: language selection, default currency,
 * and creates three initial accounts (Banco Moneeey BRL, MoneeeyCard BRL,
 * Bitcoinss BTC). Leaves the tour modal open at the end — call closeTourModal
 * to dismiss it.
 */
export async function completeLandingWizard(page: Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");

	// Language selection
	await expect(page.getByText("Select language")).toBeVisible();
	await expect(page.getByTestId("languageSelector_pt")).toBeVisible();
	await expect(page.getByTestId("languageSelector_es")).toBeVisible();
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
	await page.getByTestId("languageSelector_es").click();
	await expect(page.getByTestId("ok-button")).toContainText("Ir a Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");

	// Default currency selection
	await page.getByTestId("ok-button").click();
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();
	const defaultCurrencySelector = Select(page, "defaultCurrencySelector");
	expect(await defaultCurrencySelector.options()).toEqual(mostUsedCurrencies);
	await defaultCurrencySelector.choose(mostUsedCurrencies[0]);
	await expect(page.getByTestId("ok-button")).toContainText("Continue");
	await page.getByTestId("ok-button").click();

	// Create three initial accounts
	await Input(page, "name").change("Banco Moneeey");
	expect(await Select(page, "editorCurrency").value()).toEqual(
		"BRL Brazilian Real",
	);
	await Input(page, "editorInitial_balance").change("1234,56", "1.234,56");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("MoneeeyCard");
	expect(await Select(page, "editorCurrency").value()).toEqual(
		"BRL Brazilian Real",
	);
	await Input(page, "editorInitial_balance").change("2000,00", "2.000");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("Bitcoinss");
	await Select(page, "editorCurrency").choose("BTC Bitcoin");
	await Input(page, "editorInitial_balance").change(
		"0,123456789",
		"0,12345678",
	);
	expect(await Select(page, "editorCurrency").value()).toEqual("BTC Bitcoin");
	await page.getByTestId("save-and-close").click();

	await expect(page.getByText("Dashboard")).toBeVisible();
}

/**
 * Opens the budget editor, fills in name/currency/tag, and saves.
 * Optionally asserts the available tag options.
 */
export async function budgetEditorSave(
	page: Page,
	name: string,
	currency: string,
	tag: string,
	expectedTags?: string[],
) {
	await page.getByTestId("addNewBudget").first().click();

	const budgetEditor = page.getByTestId("budgetEditorDrawer");
	await Input(page, "budgetName", budgetEditor).change(name);

	const budgetCurrency = Select(page, "budgetCurrency");
	expect(await budgetCurrency.options()).toEqual(mostUsedCurrencies);
	await budgetCurrency.choose(currency);

	const budgetTags = Select(page, "budgetTags");
	if (expectedTags) {
		expect(await budgetTags.options()).toEqual(expectedTags);
	}
	await budgetTags.choose(tag, false);

	await budgetEditor.getByTestId("budgetSave").click();
}

/**
 * Clicks the "next" button in the guided tour modal.
 */
export function tourNext(page: Page) {
	return page.getByTestId("nm-modal-card").getByTestId("next").click();
}
