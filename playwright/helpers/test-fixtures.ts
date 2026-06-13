import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type CDPSession, type Page, test as base } from "@playwright/test";
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

const coverageEnabled = process.env.PW_COVERAGE === "on";

const safeFilePart = (value: string) =>
	value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");

export const test = base.extend<MoneeeyFixtures>({
	page: async ({ page, browserName }, use, testInfo) => {
		let coverageSession: CDPSession | undefined;
		const shouldCollect = coverageEnabled && browserName === "chromium";
		if (shouldCollect) {
			coverageSession = await page.context().newCDPSession(page);
			await coverageSession.send("Profiler.enable");
			await coverageSession.send("Profiler.startPreciseCoverage", {
				callCount: true,
				detailed: true,
			});
		}
		try {
			await use(page);
		} finally {
			if (coverageSession) {
				const coverage = await coverageSession.send(
					"Profiler.takePreciseCoverage",
				);
				await coverageSession.send("Profiler.stopPreciseCoverage");
				await coverageSession.send("Profiler.disable");
				const coverageDir = path.join(process.cwd(), "coverage", "playwright");
				await mkdir(coverageDir, { recursive: true });
				const coveragePath = path.join(
					coverageDir,
					`${safeFilePart(testInfo.project.name)}-${safeFilePart(testInfo.title)}.json`,
				);
				await writeFile(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`);
				await testInfo.attach("js-coverage", {
					path: coveragePath,
					contentType: "application/json",
				});
			}
		}
	},
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
