import { observer } from "mobx-react";
import { useMemo } from "react";

import { AccountKind } from "../../entities/Account";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import useMessages from "../../utils/Messages";

import { baseAccountBalanceReport } from "./AccountBalanceReport";
import { BaseReport } from "./BaseReport";
import KpiCard, { KpiGrid } from "./KpiCard";
import type { ReportDataMap } from "./ReportUtils";
import ReportBarChart from "./charts/ReportBarChart";
import {
	averagePerPeriod,
	formatNumber,
	peakPeriod,
	topSeries,
	totalSumAbs,
} from "./kpiCalcs";

const payeeBalanceReport = (moneeeyStore: MoneeeyStore) =>
	baseAccountBalanceReport(
		moneeeyStore,
		true,
		(account) => account.kind === AccountKind.PAYEE,
	);

const PayeeBalanceReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;
	const processFn = useMemo(
		() => payeeBalanceReport(moneeeyStore),
		[moneeeyStore],
	);

	const toPositive = (data: ReportDataMap): ReportDataMap => {
		const positivePoints = new Map<string, Record<string, number>>();
		for (const [date, record] of data.points.entries()) {
			const absRecord: Record<string, number> = {};
			for (const k of Object.keys(record)) absRecord[k] = Math.abs(record[k]);
			positivePoints.set(date, absRecord);
		}
		return { columns: data.columns, points: positivePoints };
	};

	const renderKpis = (data: ReportDataMap) => {
		const pos = toPositive(data);
		const total = totalSumAbs(pos);
		const avg = averagePerPeriod(pos);
		const peak = peakPeriod(pos);
		const top = topSeries(pos, 1)[0];
		return (
			<KpiGrid>
				<KpiCard
					testId="kpiTotal"
					label={Messages.reports.kpi_total_change}
					value={formatNumber(total)}
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
					testId="kpiTopPayee"
					label={Messages.reports.kpi_top_payee}
					value={top?.series ?? "—"}
					hint={top ? formatNumber(top.total) : ""}
				/>
			</KpiGrid>
		);
	};

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={processFn}
			title={Messages.reports.payee_balance}
			renderKpis={(data) => renderKpis(data)}
			chartFn={(data, period, helpers) => (
				<ReportBarChart
					data={toPositive(data)}
					xFormatter={period.formatter}
					hiddenSeries={helpers.hiddenSeries}
					onBarClick={helpers.onSeriesClick}
				/>
			)}
		/>
	);
});

export default PayeeBalanceReport;
