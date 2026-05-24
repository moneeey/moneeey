import { useMemo } from "react";

import { AccountKind, type TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import type { TMonetary } from "../../shared/Entity";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { type TDate, compareDates } from "../../utils/Date";

import type MoneeeyStore from "../../shared/MoneeeyStore";

import useMessages, { type TMessages } from "../../utils/Messages";

import { BaseReport } from "./BaseReport";
import KpiCard, { KpiGrid } from "./KpiCard";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";
import ReportLineChart from "./charts/ReportLineChart";
import {
	formatNumber,
	formatSigned,
	lowestPeriod,
	peakPeriod,
} from "./kpiCalcs";

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

	const renderKpis = (data: ReportDataMap) => {
		const running = withRunningBalance(data, Messages.reports.wealth);
		const sorted = Array.from(running.points.entries()).sort(([a], [b]) =>
			compareDates(a, b),
		);
		const last = sorted.length ? sorted[sorted.length - 1][1] : null;
		const first = sorted.length ? sorted[0][1] : null;
		const current = last?.[Messages.reports.wealth] ?? 0;
		const startVal = first?.[Messages.reports.wealth] ?? 0;
		const change = current - startVal;
		const avg = sorted.length > 1 ? change / (sorted.length - 1) : 0;
		const peak = peakPeriod(data);
		const low = lowestPeriod(data);
		return (
			<KpiGrid>
				<KpiCard
					testId="kpiCurrentWealth"
					label={Messages.reports.kpi_current_wealth}
					value={formatNumber(current)}
					tone={current >= 0 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiTotalChange"
					label={Messages.reports.kpi_total_change}
					value={formatSigned(change)}
					tone={change >= 0 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiAvgGrowth"
					label={Messages.reports.kpi_avg_growth}
					value={formatSigned(avg)}
					tone={avg >= 0 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiBestPeriod"
					label={Messages.reports.kpi_best_period}
					value={formatSigned(peak.value)}
					hint={peak.period ?? ""}
					tone={peak.value >= 0 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiWorstPeriod"
					label={Messages.reports.kpi_worst_period}
					value={formatSigned(low.value)}
					hint={low.period ?? ""}
					tone={low.value >= 0 ? "positive" : "negative"}
				/>
			</KpiGrid>
		);
	};

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={processFn}
			title={Messages.reports.wealth_growth}
			renderKpis={renderKpis}
			chartFn={(data, period, helpers) => (
				<ReportLineChart
					data={withRunningBalance(data, Messages.reports.wealth)}
					xFormatter={period.formatter}
					enableArea={true}
					hiddenSeries={helpers.hiddenSeries}
					onPointClick={helpers.onSeriesClick}
				/>
			)}
		/>
	);
};

export default WealthGrowReport;
