import type { ReportDataMap } from "./ReportUtils";

const flattenRecord = (record: Record<string, number>): number[] =>
	Object.values(record);

export const totalSum = (data: ReportDataMap): number => {
	let total = 0;
	for (const record of data.points.values()) {
		for (const v of flattenRecord(record)) total += v;
	}
	return total;
};

export const totalSumAbs = (data: ReportDataMap): number => {
	let total = 0;
	for (const record of data.points.values()) {
		for (const v of flattenRecord(record)) total += Math.abs(v);
	}
	return total;
};

export const averagePerPeriod = (data: ReportDataMap): number => {
	if (data.points.size === 0) return 0;
	return totalSum(data) / data.points.size;
};

export const peakPeriod = (
	data: ReportDataMap,
): { period: string | null; value: number } => {
	let peak = { period: null as string | null, value: Number.NEGATIVE_INFINITY };
	for (const [period, record] of data.points.entries()) {
		const sum = flattenRecord(record).reduce((a, b) => a + b, 0);
		if (sum > peak.value) peak = { period, value: sum };
	}
	if (peak.period === null) return { period: null, value: 0 };
	return peak;
};

export const lowestPeriod = (
	data: ReportDataMap,
): { period: string | null; value: number } => {
	let low = { period: null as string | null, value: Number.POSITIVE_INFINITY };
	for (const [period, record] of data.points.entries()) {
		const sum = flattenRecord(record).reduce((a, b) => a + b, 0);
		if (sum < low.value) low = { period, value: sum };
	}
	if (low.period === null) return { period: null, value: 0 };
	return low;
};

export const seriesTotal = (data: ReportDataMap, series: string): number => {
	let total = 0;
	for (const record of data.points.values()) {
		total += record[series] ?? 0;
	}
	return total;
};

export const sortedPeriods = (data: ReportDataMap): string[] =>
	Array.from(data.points.keys()).sort();

export const firstAndLast = (
	data: ReportDataMap,
	series: string,
): { first: number; last: number } => {
	const periods = sortedPeriods(data);
	if (periods.length === 0) return { first: 0, last: 0 };
	const first = data.points.get(periods[0])?.[series] ?? 0;
	const last = data.points.get(periods[periods.length - 1])?.[series] ?? 0;
	return { first, last };
};

export const topSeries = (
	data: ReportDataMap,
	limit = 1,
): { series: string; total: number }[] => {
	const totals = Array.from(data.columns).map((s) => ({
		series: s,
		total: seriesTotal(data, s),
	}));
	totals.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
	return totals.slice(0, limit);
};

export const formatNumber = (value: number, decimals = 2): string =>
	value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
	});

export const formatPercent = (value: number, decimals = 1): string =>
	`${(value * 100).toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
	})}%`;

export const formatSigned = (value: number, decimals = 2): string => {
	const prefix = value > 0 ? "+" : "";
	return `${prefix}${formatNumber(value, decimals)}`;
};
