import { type Page, expect } from "@playwright/test";
import { Input, Select } from "./page-objects";

/**
 * Fills in a row in the "All transactions" view by choosing from/to accounts
 * and entering an amount. Creates accounts if they don't exist.
 */
export async function updateOnAllTransactions(
	page: Page,
	index: number,
	fromAccountName: string,
	toAccountName: string,
	amount: string,
	expectedAmount?: string,
) {
	const editorFrom = Select(page, "editorFrom", index);
	await editorFrom.chooseOrCreate(fromAccountName);

	const editorTo = Select(page, "editorTo", index);
	await editorTo.chooseOrCreate(toAccountName);

	await Input(page, "editorAmount", undefined, index).change(
		amount,
		expectedAmount ?? amount,
	);
}

/**
 * Fills in a row in a reference-account view (e.g. "BRL Banco Moneeey") by
 * choosing the counterpart account and entering the amount. Optionally sets a memo.
 */
export async function updateOnAccountTransactions(
	page: Page,
	index: number,
	accountName: string,
	amount: string,
	memo?: string,
	expectedAmount?: string,
) {
	const editorAccount = Select(page, "editorAccount", index);
	await editorAccount.chooseOrCreate(accountName);

	await Input(page, "editorAmount", undefined, index).change(
		amount,
		expectedAmount ?? amount,
	);
	if (memo) {
		await Input(page, "editorMemo", undefined, index).change(memo);
	}
}

/**
 * Sets a transaction date field. The app's DatePicker only commits its value
 * on blur, so we click → fill → press Tab to trigger blur, then assert the
 * value stuck. Encapsulates a quirk callers shouldn't have to remember.
 */
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
