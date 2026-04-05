import { type Page, test as base } from "@playwright/test";
import { closeTourModal } from "./page-objects";
import { step } from "./perf";
import { resetAppState } from "./setup";
import { completeLandingWizard } from "./wizard";

/**
 * - `seededPage`: fresh app at `/` with storage wiped. Use for tests that
 *   exercise the landing wizard itself (tour.spec.ts).
 * - `wizardPage`: post-wizard Dashboard — reset + wizard + close tour modal.
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
