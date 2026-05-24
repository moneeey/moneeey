import { useMemo } from "react";

import { AccountKind, type TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import type { TMonetary } from "../../shared/Entity";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { type TDate, compareDates } from "../../utils/Date";

import type MoneeeyStore from "../../shared/MoneeeyStore";

import useMessages, { type TMessages } from "../../utils/Messages";

import { BaseLineChart, BaseReport } from "./BaseReport";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";

const wealthGrowProcess =
	(moneeeyStore: MoneeeyStore, Messages: TMessages) =>
	(transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
		const addBalanceToData = (
			acct: TAccountUUID,
			value: TMonetary,
			date: TDate,
		) => {
			const account = moneeeyStore.accounts.byUuid(acct);
			if (!account || account.kind === AccountKind.PAYEE) {
				return;
			}

			const key = dateToPeriod(period, date);
			const prev_record = data.points.get(key);
			const category = Messages.reports.wealth;
			const prev_balance = prev_record?.[category] || 0;
			const balance = prev_balance + value;
			data.columns.add(category);
			data.points.set(key, { ...prev_record, [category]: balance });
		};
		addBalanceToData(
			transaction.from_account,
			-transaction.from_value,
			transaction.date,
		);
		addBalanceToData(
			transaction.to_account,
			transaction.to_value,
			transaction.date,
		);
	};

const withRunningBalance = (
	data: ReportDataMap,
	category: string,
): ReportDataMap => {
	const sorted = Array.from(data.points.entries()).sort(([a], [b]) =>
		compareDates(a, b),
	);
	const next = new Map<string, Record<string, number>>();
	let running = 0;
	for (const [key, record] of sorted) {
		running += record[category] || 0;
		next.set(key, { [category]: running });
	}
	return { columns: data.columns, points: next };
};

const WealthGrowReport = () => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;
	const processFn = useMemo(
		() => wealthGrowProcess(moneeeyStore, Messages),
		[moneeeyStore, Messages],
	);

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={processFn}
			title={Messages.reports.wealth_growth}
			chartFn={(data, period) => (
				<BaseLineChart
					data={withRunningBalance(data, Messages.reports.wealth)}
					xFormatter={period.formatter}
				/>
			)}
		/>
	);
};

export default WealthGrowReport;
