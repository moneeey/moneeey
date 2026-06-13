import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	defaultSeedAccounts,
	expect,
	retrieveRowsData,
	seedTestEnvironment,
	test,
} from "../helpers";

test("Dashboard shows recent transactions", async ({ seededPage: page }) => {
	await seedTestEnvironment(page, {
		accounts: [
			...defaultSeedAccounts,
			{ id: "test-payee-bakery", name: "Bakery123", kind: "PAYEE" },
		],
		transactions: [
			{
				id: "test-transaction-dashboard-bread",
				from: "MoneeeyCard",
				to: "Bakery123",
				amount: 50,
				memo: "bread",
			},
		],
	});

	// Dashboard is the landing page after wizard — "Recent transactions" heading is visible
	await expect(page.getByText("Recent transactions")).toBeVisible();

	const today = formatDate(new Date());
	expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 4)).toEqual([
		`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: Bakery123 (bg---600) | amount: 50 (bg---600) | memo: bread (bg---600)`,
	]);
});
