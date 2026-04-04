import { expect, test } from "@playwright/test";
import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	OpenMenuItem,
	closeTourModal,
	completeLandingWizard,
	resetAppState,
	retrieveRowsData,
	updateOnAccountTransactions,
} from "../helpers";

test.beforeEach(async ({ page }) => {
	await resetAppState(page);
});

test("Dashboard shows recent transactions and updates after new entries", async ({
	page,
}) => {
	await completeLandingWizard(page);
	await closeTourModal(page);

	// Dashboard is the landing page after wizard — "Recent transactions" heading is visible
	await expect(page.getByText("Recent transactions")).toBeVisible();

	// Verify the 3 initial balance transactions show up in recent
	const today = formatDate(new Date());
	expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 3)).toEqual([
		`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
	]);

	// Add a transaction and verify it shows up on Dashboard
	await OpenMenuItem(page, "BRL MoneeeyCard");
	await updateOnAccountTransactions(page, 1, "Bakery123", "-50", "bread");

	await OpenMenuItem(page, "Dashboard");
	await expect(page.getByText("Recent transactions")).toBeVisible();

	expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 4)).toEqual([
		`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Bakery123 (bg---600) | amount: 50 (bg---600) | memo: bread (bg---600)`,
	]);
});
