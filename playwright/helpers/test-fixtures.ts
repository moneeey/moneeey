import { type Page, test as base } from "@playwright/test";
import { closeTourModal } from "./page-objects";
import { step } from "./perf";
import { resetAppState } from "./setup";
import { completeLandingWizard } from "./wizard";

/**
 * Custom Playwright fixtures that remove per-test setup boilerplate.
 *
 * - `seededPage`: fresh app at `/` with localStorage/IndexedDB wiped.
 *                 Use this when the test itself exercises the landing wizard
 *                 or otherwise needs to see the pristine first-run state.
 * - `wizardPage`: same as seededPage, but walks through the landing wizard
 *                 and dismisses the tour modal so the test starts on the
 *                 post-onboarding Dashboard. Use this for the ~11 tests that
 *                 just want the three default accounts set up.
 *
 * Both fixtures wrap their setup in `step()` so the timings show up in the
 * HTML report and in the `PERF_LOG=1` CLI output.
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
