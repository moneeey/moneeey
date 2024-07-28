import { AccountKind, type TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import type { TMonetary } from "../../shared/Entity";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import type { TDate } from "../../utils/Date";

import useMessages, { type TMessages } from "../../utils/Messages";

import { BaseColumnChart, BaseReport, ChartColorGeneratorForColors } from "./BaseReport";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";

const incomeVsExpensesProcess =
	(moneeeyStore: MoneeeyStore, Messages: TMessages) =>
	(transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
		const addBalanceToData = (
			acct: TAccountUUID,
			value: TMonetary,
			date: TDate,
		) => {
			const account = moneeeyStore.accounts.byUuid(acct);
			if (!account) {
				return;
			}

			let kind = "";
			if (account.kind === AccountKind.PAYEE) {
				kind = Messages.reports.expense;
			}
			if (account.kind !== AccountKind.PAYEE) {
				kind = Messages.reports.income;
			}
			if (kind === "") {
				return;
			}
			const key = dateToPeriod(period, date);
			const prev_record = data.points.get(key);
			const prev_balance = prev_record?.[kind] || 0;
			const balance = prev_balance + Math.abs(value);
			data.columns.add(kind);
			data.points.set(key, { ...prev_record, [kind]: balance });
		};
		addBalanceToData(
			transaction.to_account,
			transaction.to_value,
			transaction.date,
		);
	};

const IncomeVsExpensesReport = () => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={incomeVsExpensesProcess(moneeeyStore, Messages)}
			title={Messages.reports.income_vs_expenses}
			chartFn={(data, period) => (
				<BaseColumnChart data={data} xFormatter={period.formatter} colorGenerator={() => ChartColorGeneratorForColors([
          "text-green-600 fill-green-300 stroke-green-300",
          "text-red-600 fill-red-300 stroke-red-300",
        ])} />
			)}
		/>
	);
};

export default IncomeVsExpensesReport;
