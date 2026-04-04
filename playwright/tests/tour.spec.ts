import { expect, test } from "@playwright/test";
import {
	budgetEditorSave,
	classForTestIdTDs,
	completeLandingWizard,
	dismissNotification,
	Input,
	mostUsedCurrencies,
	resetAppState,
	tourNext,
	updateOnAllTransactions,
} from "../helpers";

test.beforeEach(async ({ page }) => {
	await resetAppState(page);
});

test("Tour walkthrough", async ({ page }) => {
	await completeLandingWizard(page);

	await page.getByTestId("start-tour").click();

	await expect(page.getByText("multi-currency")).toBeVisible();
	await tourNext(page); // Edit Currencies

	// Accounts page
	await expect(page.getByText("Manage your accounts")).toBeVisible();
	await tourNext(page); // Edit accounts

	// Transactions page — create 3 expenses
	await expect(page.getByText("generates reports and insights")).toBeVisible();

	await updateOnAllTransactions(
		page,
		2,
		"Banco Moneeey",
		"Gas Station",
		"1234,56",
		"1.234,56",
	);
	await updateOnAllTransactions(page, 3, "Banco Moneeey", "Bakery", "78,69");
	await updateOnAllTransactions(page, 4, "Banco Moneeey", "Bakery", "11,11");

	await tourNext(page);
	await expect(page.getByText("Time to budget")).toBeVisible();

	// Tour blocks progress until a budget is created
	await tourNext(page);
	await dismissNotification(
		page,
		"Before continuing, click 'New Budget' and create a budget.",
	);

	const tourExpectedTags = [
		"Bakery",
		"Banco Moneeey",
		"Bitcoinss",
		"Gas Station",
		"Initial balance BRL",
		"Initial balance BTC",
		"MoneeeyCard",
	];
	await budgetEditorSave(
		page,
		"Gas",
		mostUsedCurrencies[0],
		"Gas Station",
		tourExpectedTags,
	);
	await budgetEditorSave(
		page,
		"Bakery",
		mostUsedCurrencies[0],
		"Bakery",
		tourExpectedTags,
	);

	const editorRemainingClass = classForTestIdTDs(page, "editorRemaining");

	// Allocate on budget and wait for calculated used/remaining
	await expect(page.getByText("R$").first()).toBeVisible();
	await Input(page, "editorAllocated", undefined, 0).change("65,00", "65");
	await expect(page.getByTestId("editorUsed").nth(0)).toHaveValue("89,8", {
		timeout: 15000,
	});
	await expect(page.getByTestId("editorRemaining").nth(0)).toHaveValue(
		"-24,80",
		{ timeout: 15000 },
	);
	expect(await editorRemainingClass(0)).toEqual(
		"bg---800 opacity-80 text-red-200",
	);

	await Input(page, "editorAllocated", undefined, 1).change(
		"5435,25",
		"5.435,25",
	);
	await expect(page.getByTestId("editorUsed").nth(1)).toHaveValue("1.234,56");
	await expect(page.getByTestId("editorRemaining").nth(1)).toHaveValue(
		"4.200,69",
	);
	expect(await editorRemainingClass(1)).toEqual("bg---600 opacity-80");

	// Import step
	await tourNext(page);
	await expect(page.getByText("import transactions")).toBeVisible();

	// Final step
	await tourNext(page);
	await expect(page.getByText("Gas Station")).toBeVisible();

	// Close tour
	await tourNext(page);
	await expect(page.getByTestId("nm-modal-title")).toBeHidden();
});
