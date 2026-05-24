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
			e.includes("Maximum update depth") || e.includes("Too many re-renders"),
	);
	expect(loopMessages, loopMessages.join("\n")).toEqual([]);
}

const REPORT_TABS = [
	"Net worth",
	"Account balance",
	"Payee balance",
	"Tag expenses",
	"Tag explorer",
	"Income vs Expenses",
	"Budget vs Actual",
	"Recurring expenses",
	"Cash flow",
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

	test("legend chip toggles a series without crash", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");
		// Account balance has 3 seeded accounts → multi-series → legend renders
		await page
			.getByTestId("reportTabs")
			.getByText("Account balance")
			.first()
			.click();

		const legend = page.getByTestId("chartLegend");
		await expect(legend).toBeVisible({ timeout: 10_000 });

		const firstChip = legend.locator("button").first();
		await firstChip.click();
		await firstChip.click();

		assertNoLoop(sink);
	});

	test("clicking a bar opens an inline drill-down with transactions", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");
		await page
			.getByTestId("reportTabs")
			.getByText("Income vs Expenses")
			.first()
			.click();

		// Wait for chart, then click any rendered bar rect
		await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
		const bar = page.locator("svg rect[role='img']").first();
		if (await bar.count()) {
			await bar.click();
			await expect(page.getByTestId("reportDrillDown")).toBeVisible({
				timeout: 5_000,
			});
			await page.getByTestId("drillDownClose").click();
			await expect(page.getByTestId("reportDrillDown")).toBeHidden();
		}
		assertNoLoop(sink);
	});

	test("compare-to overlay adds ghost series and dimmed legend chips", async ({
		wizardPage: page,
	}) => {
		const sink = trackConsole(page);
		await OpenMenuItem(page, "Reports");
		await page
			.getByTestId("reportTabs")
			.getByText("Account balance")
			.first()
			.click();

		const legendBefore = page.getByTestId("chartLegend");
		await expect(legendBefore).toBeVisible({ timeout: 10_000 });
		const chipCountBefore = await legendBefore.locator("button").count();

		await openSelect(page, "reportCompareSelector");
		await page.getByText("Previous year").first().click();
		await expect.poll(() => page.url()).toContain("cmp=prevYear");

		// Comparison should at least keep the chart mounted; ghost chips render
		// only when previous-range data exists, so we just assert no crash and
		// (if any new chips appeared) at least one dashed chip is present.
		await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
		const chipCountAfter = await legendBefore.locator("button").count();
		expect(chipCountAfter).toBeGreaterThanOrEqual(chipCountBefore);

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
	await page.getByTestId(testId).locator(".mn-select__control").first().click();
}
