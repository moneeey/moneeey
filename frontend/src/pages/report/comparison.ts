import { add } from "date-fns";

import { type TDate, formatDate, parseDate } from "../../utils/Date";

import type { ReportDataMap } from "./ReportUtils";
import type { TCompareMode } from "./useReportState";

export const COMPARISON_PREFIX = "↺ ";

export const isComparisonSeries = (series: string): boolean =>
	series.startsWith(COMPARISON_PREFIX);

export const stripComparisonPrefix = (series: string): string =>
	series.startsWith(COMPARISON_PREFIX)
		? series.slice(COMPARISON_PREFIX.length)
		: series;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const rangeLengthDays = (from: TDate, to: TDate): number =>
	Math.round(
		(parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY,
	);

export const shiftRangeBackwards = (
	range: { from: TDate; to: TDate },
	mode: TCompareMode,
): { from: TDate; to: TDate } | null => {
	if (mode === "none") return null;
	if (mode === "prevYear") {
		return {
			from: formatDate(add(parseDate(range.from), { years: -1 })),
			to: formatDate(add(parseDate(range.to), { years: -1 })),
		};
	}
	const lengthDays = rangeLengthDays(range.from, range.to) + 1;
	return {
		from: formatDate(add(parseDate(range.from), { days: -lengthDays })),
		to: formatDate(add(parseDate(range.to), { days: -lengthDays })),
	};
};

export const shiftPeriodKeyForwards = (
	key: TDate,
	mode: TCompareMode,
	primaryFrom: TDate,
	primaryTo: TDate,
): TDate => {
	if (mode === "prevYear") {
		return formatDate(add(parseDate(key), { years: 1 }));
	}
	if (mode === "prevPeriod") {
		const lengthDays = rangeLengthDays(primaryFrom, primaryTo) + 1;
		return formatDate(add(parseDate(key), { days: lengthDays }));
	}
	return key;
};

export const mergeComparison = (
	primary: ReportDataMap,
	previous: ReportDataMap,
	mode: TCompareMode,
	primaryFrom: TDate,
	primaryTo: TDate,
): { merged: ReportDataMap; comparisonSeries: Set<string> } => {
	const comparisonSeries = new Set<string>();
	const mergedColumns = new Set(primary.columns);
	const mergedPoints = new Map<string, Record<string, number>>();
	for (const [k, r] of primary.points.entries()) {
		mergedPoints.set(k, { ...r });
	}

	for (const col of previous.columns) {
		const prefixed = `${COMPARISON_PREFIX}${col}`;
		comparisonSeries.add(prefixed);
		mergedColumns.add(prefixed);
	}

	for (const [periodKey, record] of previous.points.entries()) {
		const shifted = shiftPeriodKeyForwards(
			periodKey,
			mode,
			primaryFrom,
			primaryTo,
		);
		const existing = mergedPoints.get(shifted) ?? {};
		const next: Record<string, number> = { ...existing };
		for (const [series, value] of Object.entries(record)) {
			next[`${COMPARISON_PREFIX}${series}`] = value;
		}
		mergedPoints.set(shifted, next);
	}

	return {
		merged: { columns: mergedColumns, points: mergedPoints },
		comparisonSeries,
	};
};
