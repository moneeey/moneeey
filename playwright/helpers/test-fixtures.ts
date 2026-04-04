import { type Page, test as base } from "@playwright/test";
import { closeTourModal } from "./page-objects";
import { step } from "./perf";
import { resetAppState } from "./setup";
import { completeLandingWizard } from "./wizard";

/**
 * Custom Playwright fixtures that remove per-test setup boilerplate.
 *
 * - `seededPage`: fresh app at `/` with localStorage + PouchDB wiped. Use
 *                 when the test itself exercises the landing wizard
 *                 (tour.spec.ts).
 * - `wizardPage`: post-wizard Dashboard — reset + complete landing wizard +
 *                 close tour modal. Use for the ~11 tests that just want the
 *                 three default accounts set up.
 *
 * Both fixtures wrap their setup in `step()` so the timings show up in the
 * HTML report and in the `PERF_LOG=1` CLI output.
 *
 * Historical note: an earlier attempt skipped the wizard by snapshotting
 * `storageState({ indexedDB: true })` in a global setup project. That
 * approach is blocked because the app configures PouchDB with
 * `pouchdb-adapter-memory` — all entity data lives in RAM, so there is no
 * IndexedDB for Playwright to snapshot. Re-enabling the optimization would
 * require the app to use a persistent adapter (e.g. idb) under an e2e flag.
 */
type MoneeeyFixtures = {
	seededPage: Page;
	wizardPage: Page;
};

export const test = base.extend<MoneeeyFixtures>({
	seededPage: async ({ page }, use) => {
		await step("reset app state", () => resetAppState(page));
		await use(page);
	},
	wizardPage: async ({ page }, use) => {
		await step("reset app state", () => resetAppState(page));
		await step("complete landing wizard", () => completeLandingWizard(page));
		await step("close tour modal", () => closeTourModal(page));
		await use(page);
	},
});

export { expect } from "@playwright/test";
