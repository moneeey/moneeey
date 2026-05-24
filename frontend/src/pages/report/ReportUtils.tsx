import {
	startOfDay,
	startOfMonth,
	startOfQuarter,
	startOfWeek,
	startOfYear,
} from "date-fns";

import type { TAccountUUID } from "../../entities/Account";
import type { TCurrencyUUID } from "../../entities/Currency";
import type { ITransaction } from "../../entities/Transaction";
import type { TMonetary } from "../../shared/Entity";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import {
	type TDate,
	TDateFormat,
	formatDate,
	formatDateAs,
	parseDate,
} from "../../utils/Date";
import type { TMessages } from "../../utils/Messages";
import { asyncProcess } from "../../utils/Utils";

import {
	ALL_CURRENCIES,
	type TCurrencyFilter,
	type TPeriodKey,
} from "./useReportState";

export interface AsyncProcessTransactions {
	moneeeyStore: MoneeeyStore;
	processFn: AsyncProcessTransactionFn;
	accounts: TAccountUUID[];
	period: PeriodGroup;
	setProgress: (v: number) => void;
	range?: { from: TDate | null; to: TDate | null };
	currency?: TCurrencyFilter;
}

export type AsyncProcessTransactionFn = (
	transaction: ITransaction,
	period: PeriodGroup,
	data: ReportDataMap,
) => void;

export type ReportDataMap = {
	columns: Set<string>;
	points: Map<TDate, Record<string, TMonetary>>;
};

export const NewReportDataMap = (): ReportDataMap => ({
	columns: new Set<string>(),
	points: new Map(),
});

const transactionCurrencies = (
	moneeeyStore: MoneeeyStore,
	transaction: ITransaction,
): Set<TCurrencyUUID> => {
	const out = new Set<TCurrencyUUID>();
	const fromAct = moneeeyStore.accounts.byUuid(transaction.from_account);
	const toAct = moneeeyStore.accounts.byUuid(transaction.to_account);
	if (fromAct?.currency_uuid) out.add(fromAct.currency_uuid);
	if (toAct?.currency_uuid) out.add(toAct.currency_uuid);
	return out;
};

const transactionInRange = (
	transaction: ITransaction,
	range?: { from: TDate | null; to: TDate | null },
) => {
	if (!range) return true;
	if (range.from && transaction.date < range.from) return false;
	if (range.to && transaction.date > range.to) return false;
	return true;
};

const transactionMatchesCurrency = (
	moneeeyStore: MoneeeyStore,
	transaction: ITransaction,
	currency?: TCurrencyFilter,
) => {
	if (!currency || currency === ALL_CURRENCIES) return true;
	return transactionCurrencies(moneeeyStore, transaction).has(currency);
};

export const asyncProcessTransactionsForAccounts = async ({
	moneeeyStore,
	accounts,
	processFn,
	period,
	setProgress,
	range,
	currency,
}: AsyncProcessTransactions) => {
	const all = moneeeyStore.transactions.viewAllWithAccounts(accounts);
	const transactions = all.filter(
		(t) =>
			transactionInRange(t, range) &&
			transactionMatchesCurrency(moneeeyStore, t, currency),
	);

	const result = await asyncProcess(
		transactions,
		(chunk, data, percentage) => {
			setProgress(percentage);
			for (const t of chunk) {
				processFn(t, period, data);
			}
		},
		{
			state: NewReportDataMap(),
			chunkSize: 400,
			chunkThrottle: 10,
		},
	);

	return result;
};

export interface PeriodGroup {
	key: TPeriodKey;
	label: string;
	groupFn: (_date: Date) => Date;
	formatter: (_date: TDate) => string;
	order: number;
}

export const patternFormatter = (pattern: string) => (date: TDate) =>
	date.length === TDateFormat.length ? formatDateAs(date, pattern) : date;

export const dateToPeriod = (period: PeriodGroup, date: TDate) =>
	formatDate(period.groupFn(parseDate(date)));

export function PeriodGroups(
	Messages: TMessages,
): Record<TPeriodKey, PeriodGroup> {
	return {
		day: {
			key: "day",
			label: Messages.util.day,
			groupFn: startOfDay,
			formatter: patternFormatter(TDateFormat),
			order: 0,
		},
		week: {
			key: "week",
			label: Messages.util.week,
			groupFn: startOfWeek,
			formatter: patternFormatter("yyyy Lo"),
			order: 1,
		},
		month: {
			key: "month",
			label: Messages.util.month,
			groupFn: startOfMonth,
			formatter: patternFormatter("yyyy-LL"),
			order: 2,
		},
		quarter: {
			key: "quarter",
			label: Messages.util.quarter,
			groupFn: startOfQuarter,
			formatter: patternFormatter("yyyy QQQ"),
			order: 3,
		},
		year: {
			key: "year",
			label: Messages.util.year,
			groupFn: startOfYear,
			formatter: patternFormatter("yyyy"),
			order: 4,
		},
	};
}

export const periodByKey = (
	Messages: TMessages,
	key: TPeriodKey,
): PeriodGroup => PeriodGroups(Messages)[key];
