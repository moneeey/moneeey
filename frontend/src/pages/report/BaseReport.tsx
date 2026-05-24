import { keys } from "lodash";
import {
	type ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

import Loading from "../../components/Loading";
import type { IAccount } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import { type TDate, parseDate } from "../../utils/Date";
import useMessages from "../../utils/Messages";

import ChartLegend from "./ChartLegend";
import DrillDownPanel, { type DrillDownInfo } from "./DrillDownPanel";
import ReportControls, { effectiveAccountIds } from "./ReportControls";
import {
	type AsyncProcessTransactionFn,
	NewReportDataMap,
	type PeriodGroup,
	type ReportDataMap,
	asyncProcessTransactionsForAccounts,
	dateToPeriod,
	periodByKey,
} from "./ReportUtils";
import { type IReportStateApi, useReportState } from "./useReportState";

export interface ChartHelpers {
	hiddenSeries: ReadonlySet<string>;
	onSeriesClick: (info: DrillDownInfo) => void;
	colorMap?: Record<string, string>;
}

interface BaseReportProps {
	title: string;
	accounts: IAccount[];
	processFn: AsyncProcessTransactionFn;
	chartFn: (
		data: ReportDataMap,
		period: PeriodGroup,
		helpers: ChartHelpers,
	) => ReactElement;
	showCurrency?: boolean;
	showCompare?: boolean;
	showAccounts?: boolean;
	state?: IReportStateApi;
	renderKpis?: (data: ReportDataMap) => ReactElement;
	extraControls?: ReactElement;
	colorMap?: Record<string, string>;
	resolveDrillDown?: (
		info: DrillDownInfo,
		ctx: {
			period: PeriodGroup;
			accounts: string[];
			allTransactions: ITransaction[];
		},
	) => ITransaction[];
}

const roundCofficient = 1e5;
const roundPoint = (value: number) =>
	Math.round(value * roundCofficient) / roundCofficient;

const defaultDrillDownByPeriod = (
	info: DrillDownInfo,
	ctx: { period: PeriodGroup; allTransactions: ITransaction[] },
): ITransaction[] => {
	return ctx.allTransactions.filter((t) => {
		const bucket = dateToPeriod(ctx.period, t.date);
		return bucket === info.period;
	});
};

export const BaseReport = ({
	accounts,
	processFn,
	title,
	chartFn,
	showCurrency = true,
	showCompare = true,
	showAccounts = true,
	state: externalState,
	renderKpis,
	extraControls,
	colorMap,
	resolveDrillDown,
}: BaseReportProps) => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const internalState = useReportState();
	const state = externalState ?? internalState;
	const period = useMemo(
		() => periodByKey(Messages, state.period),
		[Messages, state.period],
	);
	const [data, setData] = useState(NewReportDataMap());
	const [progress, setProgress] = useState(0);
	const [hiddenSeries, setHiddenSeries] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const [drillDown, setDrillDown] = useState<DrillDownInfo | null>(null);

	const accountIdsKey = useMemo(
		() => effectiveAccountIds(accounts, state.accountIds).join(","),
		[accounts, state.accountIds],
	);
	const accountIds = useMemo(
		() => (accountIdsKey ? accountIdsKey.split(",") : []),
		[accountIdsKey],
	);
	const range = useMemo(
		() => ({ from: state.from, to: state.to }),
		[state.from, state.to],
	);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const currentData = await asyncProcessTransactionsForAccounts({
				moneeeyStore,
				accounts: accountIds,
				processFn,
				period,
				setProgress,
				range,
				currency: state.currency,
			});
			if (cancelled) return;
			setProgress(0);
			for (const points of Array.from(currentData.points.values())) {
				for (const label of keys(points)) {
					points[label] = roundPoint(points[label]);
				}
			}
			setData(currentData);
			setDrillDown(null);
		})();
		return () => {
			cancelled = true;
		};
	}, [moneeeyStore, processFn, period, range, state.currency, accountIds]);

	const toggleSeries = useCallback((s: string) => {
		setHiddenSeries((prev) => {
			const next = new Set(prev);
			if (next.has(s)) next.delete(s);
			else next.add(s);
			return next;
		});
	}, []);

	const onSeriesClick = useCallback((info: DrillDownInfo) => {
		setDrillDown(info);
	}, []);

	const chartHelpers = useMemo<ChartHelpers>(
		() => ({ hiddenSeries, onSeriesClick, colorMap }),
		[hiddenSeries, onSeriesClick, colorMap],
	);

	const seriesList = useMemo(() => Array.from(data.columns), [data]);

	const drillTransactions = useMemo<ITransaction[]>(() => {
		if (!drillDown) return [];
		const allTransactions =
			moneeeyStore.transactions.viewAllWithAccounts(accountIds);
		const inRange = allTransactions.filter((t) => {
			if (range.from && t.date < range.from) return false;
			if (range.to && t.date > range.to) return false;
			return true;
		});
		const baseCtx = {
			period,
			accounts: accountIds,
			allTransactions: inRange,
		};
		const candidates = resolveDrillDown
			? resolveDrillDown(drillDown, baseCtx)
			: defaultDrillDownByPeriod(drillDown, baseCtx);
		return candidates.sort(
			(a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime(),
		);
	}, [drillDown, moneeeyStore, accountIds, range, period, resolveDrillDown]);

	const hasData = data.points.size > 0;

	return (
		<section className="flex grow flex-col gap-3 bg-background-800 p-2 md:p-4">
			<h2 className="text-lg font-semibold">{title}</h2>
			<ReportControls
				state={state}
				accounts={accounts}
				showCurrency={showCurrency}
				showCompare={showCompare}
				showAccounts={showAccounts}
			/>
			{extraControls}
			{renderKpis && hasData && (
				<div className="mt-1" data-testid="reportKpis">
					{renderKpis(data)}
				</div>
			)}
			<Loading loading={progress !== 0} progress={progress}>
				{hasData ? (
					<section className="min-h-[24em]">
						{chartFn(data, period, chartHelpers)}
					</section>
				) : (
					<section
						data-testid="reportEmpty"
						className="flex min-h-[24em] items-center justify-center text-foreground/60"
					>
						{Messages.reports.no_data}
					</section>
				)}
			</Loading>
			{hasData && seriesList.length > 1 && (
				<ChartLegend
					series={seriesList}
					hidden={hiddenSeries}
					onToggle={toggleSeries}
					colorMap={colorMap}
				/>
			)}
			{drillDown && (
				<DrillDownPanel
					info={drillDown}
					transactions={drillTransactions}
					onClose={() => setDrillDown(null)}
					periodLabel={period.formatter(drillDown.period as TDate)}
				/>
			)}
		</section>
	);
};
