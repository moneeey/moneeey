import { AccountKind, TAccountUUID } from "../../entities/Account";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { ITransaction } from "../../entities/Transaction";

import MoneeeyStore from "../../shared/MoneeeyStore";
import { TMonetary } from "../../shared/Entity";
import { TDate } from "../../utils/Date";

import useMessages, { TMessages } from "../../utils/Messages";

import { BaseColumnChart, BaseReport } from "./BaseReport";
import { PeriodGroup, ReportDataMap, dateToPeriod } from "./ReportUtils";

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
			if (account.kind === AccountKind.PAYEE && value < 0) {
				kind = Messages.reports.expense;
			}
			if (account.kind !== AccountKind.PAYEE && value > 0) {
				kind = Messages.reports.income;
			}
			if (kind === "") {
				return;
			}
			const key = dateToPeriod(period, date);
			const prev_record = data.points.get(key);
			const prev_balance = (prev_record && prev_record[kind]) || 0;
			const balance = prev_balance + value;
			data.columns.add(kind);
			data.points.set(key, { ...prev_record, [kind]: balance });
		};
		addBalanceToData(
			transaction.from_account,
			transaction.from_value,
			transaction.date,
		);
		addBalanceToData(
			transaction.to_account,
			transaction.to_value,
			transaction.date,
		);
	};

const IncomeVsExpensesReport = function () {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={incomeVsExpensesProcess(moneeeyStore, Messages)}
			title={Messages.reports.income_vs_expenses}
			chartFn={(data, period) => (
				<BaseColumnChart data={data} xFormatter={period.formatter} />
			)}
		/>
	);
};

export default IncomeVsExpensesReport;
