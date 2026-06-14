import type { Page } from "@playwright/test";
import { formatDate } from "../../frontend/src/utils/Date";
import {
	OpenMenuItem,
	clickMenuByTestId,
	defaultSeedAccounts,
	expect,
	seedTestEnvironment,
	test,
} from "../helpers";

const SETTINGS_MENU_TESTID = "appMenu_subitems_settings_settings_general";
const VIRTUAL_ROW_COUNT = 120;

const virtualTransactions = Array.from(
	{ length: VIRTUAL_ROW_COUNT },
	(_, i) => ({
		id: `test-transaction-virtual-${String(i).padStart(3, "0")}`,
		from: "MoneeeyCard",
		to: "Virtual Payee",
		amount: i + 1,
		memo: `virtual-row-${String(i).padStart(3, "0")}`,
		date: formatDate(new Date(2030, 0, i + 1)),
	}),
);

async function renderedDesktopRowCount(page: Page) {
	return await page.evaluate(() => {
		const cells = document.querySelectorAll(
			'.transactionTable-body [data-testid="rowCell"]',
		);
		return new Set(
			Array.from(cells).map((cell) => cell.getAttribute("data-row-index")),
		).size;
	});
}

async function renderedCompactRowCount(page: Page) {
	return await page.getByTestId("transactionTable-compactRow").count();
}

async function scrollTransactionTableToBottom(page: Page) {
	await page.locator(".transactionTable-body").evaluate((element) => {
		element.scrollTop = element.scrollHeight;
		element.dispatchEvent(new Event("scroll", { bubbles: true }));
	});
}

test("Virtual table renders a window of rows and scrolls to far transactions", async ({
	seededPage: page,
}) => {
	await seedTestEnvironment(page, {
		accounts: [
			...defaultSeedAccounts,
			{ id: "test-payee-virtual", name: "Virtual Payee", kind: "PAYEE" },
		],
		transactions: virtualTransactions,
	});

	await OpenMenuItem(page, "All transactions");
	await expect(page.locator(".transactionTable-body")).toBeVisible();

	await expect.poll(() => renderedDesktopRowCount(page)).toBeGreaterThan(0);
	expect(await renderedDesktopRowCount(page)).toBeLessThan(VIRTUAL_ROW_COUNT);
	await expect(
		page.locator('input[data-testid="editorMemo"][value="virtual-row-000"]'),
	).toBeVisible();

	await scrollTransactionTableToBottom(page);
	await expect(
		page.locator('input[data-testid="editorMemo"][value="virtual-row-119"]'),
	).toBeVisible({ timeout: 10_000 });
	await expect(
		page.locator('input[data-testid="editorMemo"][value="virtual-row-000"]'),
	).toHaveCount(0);

	await clickMenuByTestId(page, SETTINGS_MENU_TESTID);
	await page.getByTestId("tableDensitySwitcher_compact").click();
	await OpenMenuItem(page, "All transactions");
	await expect.poll(() => renderedCompactRowCount(page)).toBeGreaterThan(0);
	expect(await renderedCompactRowCount(page)).toBeLessThan(VIRTUAL_ROW_COUNT);

	await scrollTransactionTableToBottom(page);
	await expect(
		page.locator('input[data-testid="editorMemo"][value="virtual-row-119"]'),
	).toBeVisible({ timeout: 10_000 });
});
