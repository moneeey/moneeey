import { type Page, test as base } from "@playwright/test";
import { step } from "./perf";
import { resetAppState } from "./setup";
import {
	defaultTransactionAccounts,
	defaultTransactions,
	seedTestEnvironment,
} from "./wizard";

/**
 * - `seededPage`: fresh app at `/` with storage wiped. Use for tests that
 *   exercise the landing wizard itself (tour.spec.ts).
 * - `wizardPage`: post-wizard Dashboard — reset + frontend test seed.
 * - `transactionsPage`: `wizardPage` plus a stable set of transaction rows.
 */
type MoneeeyFixtures = {
	seededPage: Page;
	wizardPage: Page;
	transactionsPage: Page;
};

export const test = base.extend<MoneeeyFixtures>({
	seededPage: async ({ page }, use) => {
		await step("reset app state", () => resetAppState(page));
		await use(page);
	},
	wizardPage: async ({ page }, use) => {
		await step("reset app state", () => resetAppState(page));
		await step("seed test environment", () => seedTestEnvironment(page));
		await use(page);
	},
	transactionsPage: async ({ page }, use) => {
		await step("reset app state", () => resetAppState(page));
		await step("seed transaction test environment", () =>
			seedTestEnvironment(page, {
				accounts: defaultTransactionAccounts,
				transactions: defaultTransactions,
			}),
		);
		await use(page);
	},
});

export { expect } from "@playwright/test";
