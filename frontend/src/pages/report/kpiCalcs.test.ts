import type { ReportDataMap } from "./ReportUtils";
import {
	averagePerPeriod,
	firstAndLast,
	formatNumber,
	formatPercent,
	formatSigned,
	lowestPeriod,
	peakPeriod,
	seriesTotal,
	topSeries,
	totalSum,
	totalSumAbs,
} from "./kpiCalcs";

const data = (rows: [string, Record<string, number>][]): ReportDataMap => ({
	columns: new Set(rows.flatMap(([, r]) => Object.keys(r))),
	points: new Map(rows),
});

describe("kpiCalcs", () => {
	const sample = data([
		["2026-01", { a: 10, b: -5 }],
		["2026-02", { a: 20, b: -10 }],
		["2026-03", { a: 30, b: -15 }],
	]);

	test("totalSum and totalSumAbs", () => {
		expect(totalSum(sample)).toBe(60 - 30);
		expect(totalSumAbs(sample)).toBe(60 + 30);
	});
	test("averagePerPeriod", () => {
		expect(averagePerPeriod(sample)).toBeCloseTo(10);
	});
	test("peakPeriod and lowestPeriod", () => {
		expect(peakPeriod(sample)).toEqual({ period: "2026-03", value: 15 });
		expect(lowestPeriod(sample)).toEqual({ period: "2026-01", value: 5 });
	});
	test("seriesTotal", () => {
		expect(seriesTotal(sample, "a")).toBe(60);
		expect(seriesTotal(sample, "b")).toBe(-30);
		expect(seriesTotal(sample, "nonexistent")).toBe(0);
	});
	test("firstAndLast", () => {
		expect(firstAndLast(sample, "a")).toEqual({ first: 10, last: 30 });
	});
	test("topSeries", () => {
		const top = topSeries(sample, 2);
		expect(top[0].series).toBe("a");
		expect(top[0].total).toBe(60);
		expect(top[1].series).toBe("b");
		expect(top[1].total).toBe(-30);
	});
	test("formatNumber respects max decimals", () => {
		expect(formatNumber(1234.5678, 2)).toMatch(/1[.,]234[.,]57/);
	});
	test("formatPercent", () => {
		expect(formatPercent(0.123)).toMatch(/12\.3%/);
	});
	test("formatSigned adds plus for positive", () => {
		expect(formatSigned(100)).toMatch(/\+100/);
		expect(formatSigned(-50)).toMatch(/^-50/);
	});

	test("empty data returns safe defaults", () => {
		const empty = data([]);
		expect(totalSum(empty)).toBe(0);
		expect(averagePerPeriod(empty)).toBe(0);
		expect(peakPeriod(empty)).toEqual({ period: null, value: 0 });
		expect(lowestPeriod(empty)).toEqual({ period: null, value: 0 });
	});
});
