import { observer } from "mobx-react";
import { useMemo } from "react";

import { AccountKind, type IAccount } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { type TDate, compareDates } from "../../utils/Date";

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
import { SIGN_PALETTE } from "./nivoTheme";

const ASSET_KINDS = new Set<AccountKind>([
	AccountKind.CHECKING,
	AccountKind.INVESTMENT,
	AccountKind.SAVINGS,
]);
const LIABILITY_KINDS = new Set<AccountKind>([AccountKind.CREDIT_CARD]);

const isAsset = (account: IAccount) => ASSET_KINDS.has(account.kind);
const isLiability = (account: IAccount) => LIABILITY_KINDS.has(account.kind);

const netWorthProcess =
	(moneeeyStore: MoneeeyStore, Messages: TMessages) =>
	(transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
		const assetsLabel = Messages.reports.assets;
		const liabilitiesLabel = Messages.reports.liabilities;

		const credit = (uuid: string, value: number, date: TDate) => {
			const acct = moneeeyStore.accounts.byUuid(uuid);
			if (!acct || acct.archived) return;
			const bucket = isAsset(acct)
				? assetsLabel
				: isLiability(acct)
					? liabilitiesLabel
					: null;
			if (bucket === null) return;
			const key = dateToPeriod(period, date);
			const prev = data.points.get(key);
			const prevBalance = prev?.[bucket] || 0;
			data.columns.add(bucket);
			data.points.set(key, { ...prev, [bucket]: prevBalance + value });
		};

		credit(transaction.from_account, -transaction.from_value, transaction.date);
		credit(transaction.to_account, transaction.to_value, transaction.date);
	};

const withRunningAndNet = (
	data: ReportDataMap,
	Messages: TMessages,
): ReportDataMap => {
	const sorted = Array.from(data.points.entries()).sort(([a], [b]) =>
		compareDates(a, b),
	);
	const assets = Messages.reports.assets;
	const liabilities = Messages.reports.liabilities;
	const net = Messages.reports.net;

	const nextPoints = new Map<string, Record<string, number>>();
	let runAssets = 0;
	let runLiab = 0;
	for (const [key, record] of sorted) {
		runAssets += record[assets] || 0;
		runLiab += record[liabilities] || 0;
		nextPoints.set(key, {
			[assets]: runAssets,
			[liabilities]: Math.abs(runLiab),
			[net]: runAssets - Math.abs(runLiab),
		});
	}
	const nextColumns = new Set<string>([assets, liabilities, net]);
	return { columns: nextColumns, points: nextPoints };
};

const NetWorthReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	const reportAccounts = useMemo(
		() =>
			accounts.all.filter(
				(a) => (isAsset(a) || isLiability(a)) && !a.archived,
			),
		[accounts.all],
	);

	const processFn = useMemo(
		() => netWorthProcess(moneeeyStore, Messages),
		[moneeeyStore, Messages],
	);

	const colorMap = useMemo(
		() => ({
			[Messages.reports.assets]: SIGN_PALETTE.positive,
			[Messages.reports.liabilities]: SIGN_PALETTE.negative,
			[Messages.reports.net]: SIGN_PALETTE.neutral,
		}),
		[Messages],
	);

	const renderKpis = (data: ReportDataMap) => {
		const running = withRunningAndNet(data, Messages);
		const sorted = Array.from(running.points.entries()).sort(([a], [b]) =>
			compareDates(a, b),
		);
		const last = sorted.length ? sorted[sorted.length - 1][1] : null;
		const first = sorted.length ? sorted[0][1] : null;
		const netKey = Messages.reports.net;
		const current = last?.[netKey] ?? 0;
		const startVal = first?.[netKey] ?? 0;
		const change = current - startVal;
		const avg = sorted.length > 1 ? change / (sorted.length - 1) : 0;
		const peak = peakPeriod({
			columns: new Set([netKey]),
			points: new Map(
				sorted.map(([k, r]) => [k, { [netKey]: r[netKey] ?? 0 }]),
			),
		});
		const low = lowestPeriod({
			columns: new Set([netKey]),
			points: new Map(
				sorted.map(([k, r]) => [k, { [netKey]: r[netKey] ?? 0 }]),
			),
		});
		return (
			<KpiGrid>
				<KpiCard
					testId="kpiCurrentNetWorth"
					label={Messages.reports.kpi_current_wealth}
					value={formatNumber(current)}
					tone={current >= 0 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiNetWorthChange"
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
				/>
				<KpiCard
					testId="kpiWorstPeriod"
					label={Messages.reports.kpi_worst_period}
					value={formatSigned(low.value)}
					hint={low.period ?? ""}
				/>
			</KpiGrid>
		);
	};

	return (
		<BaseReport
			accounts={reportAccounts}
			processFn={processFn}
			title={Messages.reports.net_worth}
			renderKpis={renderKpis}
			colorMap={colorMap}
			chartFn={(data, period, helpers) => (
				<ReportLineChart
					data={withRunningAndNet(data, Messages)}
					xFormatter={period.formatter}
					hiddenSeries={helpers.hiddenSeries}
					onPointClick={helpers.onSeriesClick}
					colorMap={helpers.colorMap}
					enableArea={true}
				/>
			)}
		/>
	);
});

export default NetWorthReport;
