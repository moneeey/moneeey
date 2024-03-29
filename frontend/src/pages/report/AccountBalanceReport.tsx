import { observer } from "mobx-react";

import {
	AccountKind,
	type IAccount,
	type TAccountUUID,
} from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import type { TMonetary } from "../../shared/Entity";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import type { TDate } from "../../utils/Date";

import type MoneeeyStore from "../../shared/MoneeeyStore";

import useMessages from "../../utils/Messages";

import { BaseColumnChart, BaseReport } from "./BaseReport";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";

export const baseAccountBalanceReport =
	(
		moneeeyStore: MoneeeyStore,
		fromIsPositive: boolean,
		filter: (account: IAccount) => boolean,
	) =>
	(transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
		const addBalanceToData = (
			acct: TAccountUUID,
			value: TMonetary,
			date: TDate,
		) => {
			const account = moneeeyStore.accounts.byUuid(acct);
			if (!account || !filter(account)) {
				return;
			}
			const group_date = dateToPeriod(period, date);
			const key = group_date;
			const prev_record = data.points.get(key);
			const prev_balance = prev_record?.[account.name] || 0;
			const balance = prev_balance + value;
			data.columns.add(account.name);
			data.points.set(key, { ...prev_record, [account.name]: balance });
		};
		addBalanceToData(
			transaction.from_account,
			fromIsPositive ? transaction.from_value : -transaction.from_value,
			transaction.date,
		);
		addBalanceToData(
			transaction.to_account,
			fromIsPositive ? -transaction.to_value : transaction.to_value,
			transaction.date,
		);
	};

export const accountBalanceReport = (moneeeyStore: MoneeeyStore) =>
	baseAccountBalanceReport(
		moneeeyStore,
		false,
		(account) => account.kind !== AccountKind.PAYEE,
	);

const AccountBalanceReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	return (
		<BaseReport
			accounts={accounts.allNonPayees}
			processFn={accountBalanceReport(moneeeyStore)}
			title={Messages.reports.account_balance}
			chartFn={(data, period) => (
				<BaseColumnChart data={data} xFormatter={period.formatter} />
			)}
		/>
	);
});

export default AccountBalanceReport;
