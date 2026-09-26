import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	Input,
	Select,
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

test("Quick add transaction modal opens via Dashboard button", async ({
	seededPage: page,
}) => {
	await seedTestEnvironment(page, {
		accounts: defaultSeedAccounts,
		transactions: [],
	});

	await expect(page.getByTestId("dashboardNewTxBtn")).toBeVisible();
	await page.getByTestId("dashboardNewTxBtn").click();
	await expect(page.getByTestId("newTransactionModal")).toBeVisible();
	await page.getByTestId("newTxCancel").click();
	await expect(page.getByTestId("newTransactionModal")).not.toBeVisible();
});

test("Quick add transaction modal opens with hotkey N and creates transaction", async ({
	seededPage: page,
}) => {
	await seedTestEnvironment(page, {
		accounts: [
			...defaultSeedAccounts,
			{ id: "test-payee-bakery", name: "Bakery123", kind: "PAYEE" },
		],
		transactions: [],
	});

	await expect(page.getByText("Recent transactions")).toBeVisible();

	// Press N hotkey
	await page.keyboard.press("n");
	await expect(page.getByTestId("newTransactionModal")).toBeVisible();

	// Fill amount
	await Input(page, "newTxAmount").change("75,50", "75,50");

	// Fill to payee
	await Select(page, "newTxTo").chooseOrCreate("Bakery123");

	// Fill memo
	await page.getByTestId("newTxMemo").fill("Morning coffee");

	// Click save
	await page.getByTestId("newTxSubmit").click();

	// Modal closes
	await expect(page.getByTestId("newTransactionModal")).not.toBeVisible();

	// Check transaction in recent transactions table
	await expect(page.locator('input[value="Morning coffee"]')).toBeVisible();
});
