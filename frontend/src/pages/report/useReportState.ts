import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { TAccountUUID } from "../../entities/Account";
import type { TCurrencyUUID } from "../../entities/Currency";
import { type TDate, formatDate } from "../../utils/Date";

export type TPeriodKey = "day" | "week" | "month" | "quarter" | "year";
export type TRangePreset =
	| "thisMonth"
	| "last30d"
	| "ytd"
	| "last12mo"
	| "allTime"
	| "custom";
export type TCompareMode = "none" | "prevPeriod" | "prevYear";

export const ALL_CURRENCIES = "all" as const;
export type TCurrencyFilter = TCurrencyUUID | typeof ALL_CURRENCIES;

export interface IReportState {
	from: TDate | null;
	to: TDate | null;
	preset: TRangePreset;
	period: TPeriodKey;
	accountIds: ReadonlySet<TAccountUUID>;
	currency: TCurrencyFilter;
	compare: TCompareMode;
	extras: Readonly<Record<string, string>>;
}

const DEFAULT_PRESET: TRangePreset = "last12mo";
const DEFAULT_PERIOD: TPeriodKey = "month";

const subMonths = (date: Date, months: number) => {
	const next = new Date(date);
	next.setMonth(next.getMonth() - months);
	return next;
};

const subDays = (date: Date, days: number) => {
	const next = new Date(date);
	next.setDate(next.getDate() - days);
	return next;
};

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
const startOfMonth = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), 1);

export const resolveRange = (
	preset: TRangePreset,
	customFrom: TDate | null,
	customTo: TDate | null,
	now: Date = new Date(),
): { from: TDate | null; to: TDate | null } => {
	switch (preset) {
		case "thisMonth":
			return { from: formatDate(startOfMonth(now)), to: formatDate(now) };
		case "last30d":
			return { from: formatDate(subDays(now, 30)), to: formatDate(now) };
		case "ytd":
			return { from: formatDate(startOfYear(now)), to: formatDate(now) };
		case "last12mo":
			return { from: formatDate(subMonths(now, 12)), to: formatDate(now) };
		case "allTime":
			return { from: null, to: null };
		case "custom":
			return { from: customFrom, to: customTo };
	}
};

const parseAccountIds = (raw: string | null): ReadonlySet<TAccountUUID> => {
	if (!raw) return new Set();
	return new Set(raw.split(",").filter(Boolean));
};

const serializeAccountIds = (ids: ReadonlySet<TAccountUUID>): string =>
	Array.from(ids).join(",");

const isPreset = (value: string | null): value is TRangePreset =>
	value === "thisMonth" ||
	value === "last30d" ||
	value === "ytd" ||
	value === "last12mo" ||
	value === "allTime" ||
	value === "custom";

const isPeriod = (value: string | null): value is TPeriodKey =>
	value === "day" ||
	value === "week" ||
	value === "month" ||
	value === "quarter" ||
	value === "year";

const isCompare = (value: string | null): value is TCompareMode =>
	value === "none" || value === "prevPeriod" || value === "prevYear";

const RESERVED_KEYS = new Set([
	"from",
	"to",
	"preset",
	"period",
	"accts",
	"cur",
	"cmp",
]);

export interface IReportStateApi extends IReportState {
	setPreset: (preset: TRangePreset) => void;
	setCustomRange: (from: TDate | null, to: TDate | null) => void;
	setPeriod: (period: TPeriodKey) => void;
	setAccountIds: (ids: ReadonlySet<TAccountUUID>) => void;
	toggleAccount: (id: TAccountUUID) => void;
	setCurrency: (currency: TCurrencyFilter) => void;
	setCompare: (compare: TCompareMode) => void;
	getExtra: (key: string) => string | null;
	setExtra: (key: string, value: string | null) => void;
}

export const useReportState = (
	defaults?: Partial<IReportState>,
): IReportStateApi => {
	const [params, setParams] = useSearchParams();

	const preset = useMemo<TRangePreset>(() => {
		const raw = params.get("preset");
		if (isPreset(raw)) return raw;
		return defaults?.preset ?? DEFAULT_PRESET;
	}, [params, defaults?.preset]);

	const customFrom = params.get("from");
	const customTo = params.get("to");
	const { from, to } = useMemo(
		() => resolveRange(preset, customFrom, customTo),
		[preset, customFrom, customTo],
	);

	const period = useMemo<TPeriodKey>(() => {
		const raw = params.get("period");
		if (isPeriod(raw)) return raw;
		return defaults?.period ?? DEFAULT_PERIOD;
	}, [params, defaults?.period]);

	const accountIds = useMemo(
		() => parseAccountIds(params.get("accts")),
		[params],
	);

	const currency = useMemo<TCurrencyFilter>(() => {
		const raw = params.get("cur");
		if (raw && raw.length > 0) return raw;
		return defaults?.currency ?? ALL_CURRENCIES;
	}, [params, defaults?.currency]);

	const compare = useMemo<TCompareMode>(() => {
		const raw = params.get("cmp");
		if (isCompare(raw)) return raw;
		return defaults?.compare ?? "none";
	}, [params, defaults?.compare]);

	const extras = useMemo<Record<string, string>>(() => {
		const out: Record<string, string> = {};
		params.forEach((value, key) => {
			if (!RESERVED_KEYS.has(key)) out[key] = value;
		});
		return out;
	}, [params]);

	const mutate = useCallback(
		(updater: (next: URLSearchParams) => void) => {
			setParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					updater(next);
					return next;
				},
				{ replace: true },
			);
		},
		[setParams],
	);

	const setPreset = useCallback(
		(nextPreset: TRangePreset) => {
			mutate((next) => {
				if (nextPreset === DEFAULT_PRESET) next.delete("preset");
				else next.set("preset", nextPreset);
				if (nextPreset !== "custom") {
					next.delete("from");
					next.delete("to");
				}
			});
		},
		[mutate],
	);

	const setCustomRange = useCallback(
		(nextFrom: TDate | null, nextTo: TDate | null) => {
			mutate((next) => {
				next.set("preset", "custom");
				if (nextFrom) next.set("from", nextFrom);
				else next.delete("from");
				if (nextTo) next.set("to", nextTo);
				else next.delete("to");
			});
		},
		[mutate],
	);

	const setPeriod = useCallback(
		(nextPeriod: TPeriodKey) => {
			mutate((next) => {
				if (nextPeriod === DEFAULT_PERIOD) next.delete("period");
				else next.set("period", nextPeriod);
			});
		},
		[mutate],
	);

	const setAccountIds = useCallback(
		(ids: ReadonlySet<TAccountUUID>) => {
			mutate((next) => {
				if (ids.size === 0) next.delete("accts");
				else next.set("accts", serializeAccountIds(ids));
			});
		},
		[mutate],
	);

	const toggleAccount = useCallback(
		(id: TAccountUUID) => {
			const nextSet = new Set(accountIds);
			if (nextSet.has(id)) nextSet.delete(id);
			else nextSet.add(id);
			setAccountIds(nextSet);
		},
		[accountIds, setAccountIds],
	);

	const setCurrency = useCallback(
		(nextCurrency: TCurrencyFilter) => {
			mutate((next) => {
				if (nextCurrency === ALL_CURRENCIES) next.delete("cur");
				else next.set("cur", nextCurrency);
			});
		},
		[mutate],
	);

	const setCompare = useCallback(
		(nextCompare: TCompareMode) => {
			mutate((next) => {
				if (nextCompare === "none") next.delete("cmp");
				else next.set("cmp", nextCompare);
			});
		},
		[mutate],
	);

	const getExtra = useCallback((key: string) => params.get(key), [params]);

	const setExtra = useCallback(
		(key: string, value: string | null) => {
			mutate((next) => {
				if (value === null || value === "") next.delete(key);
				else next.set(key, value);
			});
		},
		[mutate],
	);

	return {
		from,
		to,
		preset,
		period,
		accountIds,
		currency,
		compare,
		extras,
		setPreset,
		setCustomRange,
		setPeriod,
		setAccountIds,
		toggleAccount,
		setCurrency,
		setCompare,
		getExtra,
		setExtra,
	};
};
