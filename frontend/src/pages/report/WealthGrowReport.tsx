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

const WealthGrowReport = () => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={wealthGrowProcess(moneeeyStore, Messages)}
			title={Messages.reports.wealth_growth}
			chartFn={(data, period) => {
				const sorted = Array.from(data.points.entries()).sort(
					([keyA], [keyB]) => compareDates(keyA, keyB),
				);
				sorted.forEach(([key, points], index) => {
					const category = Messages.reports.wealth;
					const previousKey =
						index > 0 && sorted[index - 1] && sorted[index - 1][0];
					let previous = 0;
					if (previousKey) {
						const previousRecord = data.points.get(previousKey);
						if (previousRecord) {
							previous = previousRecord[category] || 0;
						}
					}
					const current = points[category];
					const withPrevious = current + previous;
					data.points.set(key, { [category]: withPrevious });
				});

				return <BaseLineChart data={data} xFormatter={period.formatter} />;
			}}
		/>
	);
};

export default WealthGrowReport;
