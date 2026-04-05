import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	Input,
	OpenMenuItem,
	Select,
	clickMenuByTestId,
	expect,
	retrieveRowsData,
	test,
	updateOnAccountTransactions,
} from "../helpers";

const ACCOUNTS_MENU_TESTID = "appMenu_subitems_settings_settings_accounts";

test("Account settings — rename, archive, merge", async ({
	wizardPage: page,
}) => {
	// Navigate to Settings > Accounts (by testId to avoid "Include accounts:" text clash)
	await clickMenuByTestId(page, ACCOUNTS_MENU_TESTID);

	// Accounts sorted alphabetically: Banco Moneeey, Bitcoinss, MoneeeyCard
	await expect(page.getByTestId("editorName").nth(0)).toHaveValue(
		"Banco Moneeey",
	);
	await expect(page.getByTestId("editorName").nth(1)).toHaveValue("Bitcoinss");
	await expect(page.getByTestId("editorName").nth(2)).toHaveValue(
		"MoneeeyCard",
	);

	// Rename Banco Moneeey → Banco Principal
	await Input(page, "editorName", undefined, 0).change("Banco Principal");

	// Sidebar reflects the rename; scope to `appMenu` to avoid page-body matches.
	const menuToggle = page.getByTestId("toggleMenu");
	if ((await menuToggle.getAttribute("data-expanded")) === "false") {
		await menuToggle.click();
	}
	const sidebar = page.getByTestId("appMenu");
	await expect(sidebar.getByText("BRL Banco Principal")).toBeVisible();
	await expect(sidebar.getByText("BRL Banco Moneeey")).not.toBeVisible();

	// Archive Bitcoinss via the Archived checkbox
	await page.getByTestId("editorArchived").nth(1).click();
	await expect(sidebar.getByText("BTC Bitcoinss")).not.toBeVisible();

	// Add a transaction on Banco Principal to test merge reassignment
	await sidebar.getByText("BRL Banco Principal").click();
	await updateOnAccountTransactions(page, 1, "MoneeeyCard", "-500");

	// Merge Banco Principal → MoneeeyCard
	await clickMenuByTestId(page, ACCOUNTS_MENU_TESTID);
	await page.getByText("Merge accounts").click();
	await Select(page, "source_account").choose("Banco Principal");
	await Select(page, "target_account").choose("MoneeeyCard");
	await page.getByTestId("merge-accounts").click();

	// Banco Principal is gone from sidebar
	await expect(sidebar.getByText("BRL Banco Principal")).not.toBeVisible();

	// Verify all transactions that referenced Banco Principal now reference MoneeeyCard
	await OpenMenuItem(page, "All transactions");
	const today = formatDate(new Date());
	// Note: Bitcoinss is archived, so its name doesn't resolve in the select — shows "To" placeholder
	expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 5)).toEqual([
		`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: MoneeeyCard (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: To (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: MoneeeyCard (bg---600) | to: MoneeeyCard (bg---600) | amount: 500 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: From (bg---800) | to: To (bg---800) | amount: 0 (bg---800) | memo:  (bg---800)`,
	]);
});
