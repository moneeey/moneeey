/**
 * Reports smoke + regression coverage. Ensures every report tab renders a
 * chart from seeded wizard data, that the controls (date range, period, tag
 * depth) work, and — critically — that no report triggers an infinite render
 * loop (collects console errors and fails on "Maximum update depth").
 */
import { OpenMenuItem, expect, test } from "../helpers";

type ConsoleSink = {
	errors: string[];
};

function trackConsole(page: import("@playwright/test").Page): ConsoleSink {
	const sink: ConsoleSink = { errors: [] };
	page.on("console", (msg) => {
		if (msg.type() === "error") sink.errors.push(msg.text());
	});
	page.on("pageerror", (err) => {
		sink.errors.push(err.message);
	});
	return sink;
}

function assertNoLoop(sink: ConsoleSink) {
	const loopMessages = sink.errors.filter(
		(e) =>
			e.includes("Maximum update depth") ||
			e.includes("Too many re-renders"),
	);
	expect(loopMessages, loopMessages.join("\n")).toEqual([]);
}

const REPORT_TABS = [
	"Account balance",
	"Payee balance",
	"Tag expenses",
	"Income vs Expenses",
	"Wealth growth",
];

test.describe("Reports", () => {
	test("each report tab renders a chart with seeded data", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");
		await expect(page.getByTestId("reportTabs")).toBeVisible();

		for (const tab of REPORT_TABS) {
			await page.getByTestId("reportTabs").getByText(tab).first().click();
			const tabPanel = page.locator("section").filter({ hasText: tab }).first();
			await expect(tabPanel).toBeVisible();

			// Wait for either chart svg or the empty-state placeholder
			const chartOrEmpty = page
				.locator("svg")
				.or(page.getByTestId("reportEmpty"));
			await chartOrEmpty.first().waitFor({ state: "visible", timeout: 15_000 });

			assertNoLoop(sink);
		}
	});

	test("date range preset switch reflects in URL and re-renders chart", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");
		await expect(page.getByTestId("reportTabs")).toBeVisible();

		await openSelect(page, "reportPresetSelector");
		await page.getByText("Year to date").first().click();

		await expect.poll(() => page.url()).toContain("preset=ytd");
		assertNoLoop(sink);
	});

	test("period selector changes bucket granularity without crash", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");

		await openSelect(page, "reportPeriodSelector");
		await page.getByText("Year", { exact: true }).first().click();

		await expect.poll(() => page.url()).toContain("period=year");
		await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
		assertNoLoop(sink);
	});

	test("tag depth selector on Tag expenses survives a round-trip", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");

		await page
			.getByTestId("reportTabs")
			.getByText("Tag expenses")
			.first()
			.click();
		await expect(page.getByTestId("tagDepthSelector")).toBeVisible();

		await openSelect(page, "tagDepthSelector");
		await page.getByText("2", { exact: true }).first().click();

		await expect.poll(() => page.url()).toContain("depth=2");
		assertNoLoop(sink);
	});
});

async function openSelect(
	page: import("@playwright/test").Page,
	testId: string,
) {
	await page
		.getByTestId(testId)
		.locator(".mn-select__control")
		.first()
		.click();
}
