import { type Page, expect } from "@playwright/test";
import { Input, Select } from "./page-objects";

/** Fills a row in the "All transactions" view. Creates accounts if missing. */
export async function updateOnAllTransactions(
	page: Page,
	index: number,
	fromAccountName: string,
	toAccountName: string,
	amount: string,
	expectedAmount?: string,
) {
	await Select(page, "editorFrom", index).chooseOrCreate(fromAccountName);
	await Select(page, "editorTo", index).chooseOrCreate(toAccountName);
	await Input(page, "editorAmount", undefined, index).change(
		amount,
		expectedAmount ?? amount,
	);
}

/** Fills a row in a reference-account view (counterpart + amount + optional memo). */
export async function updateOnAccountTransactions(
	page: Page,
	index: number,
	accountName: string,
	amount: string,
	memo?: string,
	expectedAmount?: string,
) {
	await Select(page, "editorAccount", index).chooseOrCreate(accountName);
	await Input(page, "editorAmount", undefined, index).change(
		amount,
		expectedAmount ?? amount,
	);
	if (memo) {
		await Input(page, "editorMemo", undefined, index).change(memo);
	}
}

/** Sets a date field. DatePicker commits on blur, so we fill then press Tab. */
export async function setDateField(
	page: Page,
	testId: string,
	index: number,
	value: string,
) {
	const input = page.getByTestId(testId).nth(index);
	await input.click();
	await input.fill(value);
	await input.press("Tab");
	await expect(input).toHaveValue(value);
}
