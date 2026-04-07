import { type Locator, type Page, expect } from "@playwright/test";
import { mostUsedCurrencies } from "./fixtures";
import { Input, Select } from "./page-objects";

/**
 * Walks through the landing wizard: language → default currency → 3 initial
 * accounts. Leaves the tour modal open (call closeTourModal to dismiss).
 */
export async function completeLandingWizard(page: Page) {
	await expect(page.getByTestId("minimalScreenTitle")).toContainText("Moneeey");

	await expect(page.getByText("Select language")).toBeVisible();
	await expect(page.getByTestId("languageSelector_pt")).toBeVisible();
	await expect(page.getByTestId("languageSelector_es")).toBeVisible();
	await expect(page.getByTestId("languageSelector_en")).toBeVisible();
	await page.getByTestId("languageSelector_es").click();
	await expect(page.getByTestId("ok-button")).toContainText("Ir a Moneeey");
	await page.getByTestId("languageSelector_en").click();
	await expect(page.getByTestId("ok-button")).toContainText("Go to Moneeey");

	await page.getByTestId("ok-button").click();
	await expect(page.getByTestId("defaultCurrencySelector")).toBeVisible();
	const defaultCurrencySelector = Select(page, "defaultCurrencySelector");
	expect(await defaultCurrencySelector.options()).toEqual(mostUsedCurrencies);
	await defaultCurrencySelector.choose(mostUsedCurrencies[0]);
	await expect(page.getByTestId("ok-button")).toContainText("Continue");
	await page.getByTestId("ok-button").click();

	// The currency picker on account forms uses `expect().toHaveText()` so
	// Playwright auto-retries until the react-select finishes rehydrating
	// the CONFIG default after each `save-and-add-another` re-mounts it.
	const currencyValueText = () =>
		page
			.getByTestId("editorCurrency")
			.locator(".mn-select__single-value, .mn-select__placeholder");

	await Input(page, "name").change("Banco Moneeey");
	await expect(currencyValueText()).toHaveText("BRL Brazilian Real");
	await Input(page, "editorInitial_balance").change("1234,56", "1.234,56");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("MoneeeyCard");
	await expect(currencyValueText()).toHaveText("BRL Brazilian Real");
	await Input(page, "editorInitial_balance").change("2000,00", "2.000");
	await page.getByTestId("save-and-add-another").click();

	await Input(page, "name").change("Bitcoinss");
	await Select(page, "editorCurrency").choose("BTC Bitcoin");
	await Input(page, "editorInitial_balance").change(
		"0,123456789",
		"0,12345678",
	);
	await expect(currencyValueText()).toHaveText("BTC Bitcoin");
	await page.getByTestId("save-and-close").click();

	await expect(page.getByText("Dashboard")).toBeVisible();
}

/** Opens budget editor, fills name/tag, saves. */
export async function budgetEditorSave(
	page: Page,
	name: string,
	tag: string,
	expectedTags?: string[],
) {
	await page.getByTestId("addNewBudget").first().click();

	const budgetEditor = page.getByTestId("budgetEditorDrawer");
	await Input(page, "budgetName", budgetEditor).change(name);

	const budgetTags = Select(page, "budgetTags");
	if (expectedTags) {
		expect(await budgetTags.options()).toEqual(expectedTags);
	}
	await budgetTags.choose(tag, false);

	await budgetEditor.getByTestId("budgetSave").click();
}

export function tourNext(page: Page) {
	return page.getByTestId("nm-modal-card").getByTestId("next").click();
}

/** Opens the budget editor at `index`, runs `fn`, auto-closes if still open. */
export async function withBudgetEditor(
	page: Page,
	index: number,
	fn: (drawer: Locator) => Promise<void>,
) {
	await page.getByTestId("editorBudget").nth(index).click();
	const drawer = page.getByTestId("budgetEditorDrawer");
	await expect(drawer).toBeVisible();
	await fn(drawer);
	if (await drawer.isVisible()) {
		await drawer.getByText("Close").click();
		await expect(drawer).not.toBeVisible();
	}
}
