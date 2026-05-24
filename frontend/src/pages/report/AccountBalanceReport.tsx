import { observer } from "mobx-react";
import { useMemo } from "react";

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

import { BaseReport } from "./BaseReport";
import KpiCard, { KpiGrid } from "./KpiCard";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";
import ReportBarChart from "./charts/ReportBarChart";
import {
	averagePerPeriod,
	formatNumber,
	peakPeriod,
	topSeries,
	totalSum,
} from "./kpiCalcs";

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
	const processFn = useMemo(
		() => accountBalanceReport(moneeeyStore),
		[moneeeyStore],
	);

	const renderKpis = (data: ReportDataMap) => {
		const total = totalSum(data);
		const avg = averagePerPeriod(data);
		const peak = peakPeriod(data);
		const top = topSeries(data, 1)[0];
		return (
			<KpiGrid>
				<KpiCard
					testId="kpiTotalChange"
					label={Messages.reports.kpi_total_change}
					value={formatNumber(total)}
					tone={total >= 0 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiAvgPerPeriod"
					label={Messages.reports.kpi_avg_per_period}
					value={formatNumber(avg)}
				/>
				<KpiCard
					testId="kpiPeak"
					label={Messages.reports.kpi_peak_period}
					value={formatNumber(peak.value)}
					hint={peak.period ?? ""}
				/>
				<KpiCard
					testId="kpiTopAccount"
					label={Messages.reports.kpi_top_account}
					value={top?.series ?? "—"}
					hint={top ? formatNumber(top.total) : ""}
				/>
			</KpiGrid>
		);
	};

	return (
		<BaseReport
			accounts={accounts.allNonPayees}
			processFn={processFn}
			title={Messages.reports.account_balance}
			renderKpis={renderKpis}
			chartFn={(data, period, helpers) => (
				<ReportBarChart
					data={data}
					xFormatter={period.formatter}
					hiddenSeries={helpers.hiddenSeries}
					onBarClick={helpers.onSeriesClick}
				/>
			)}
		/>
	);
});

export default AccountBalanceReport;
