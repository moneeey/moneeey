import { keys } from "lodash";
import { type ReactElement, useEffect, useMemo, useState } from "react";

import Loading from "../../components/Loading";
import type { IAccount } from "../../entities/Account";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import useMessages from "../../utils/Messages";

import ReportControls, { effectiveAccountIds } from "./ReportControls";
import {
	type AsyncProcessTransactionFn,
	NewReportDataMap,
	type PeriodGroup,
	type ReportDataMap,
	asyncProcessTransactionsForAccounts,
	periodByKey,
} from "./ReportUtils";
import { type IReportStateApi, useReportState } from "./useReportState";

interface BaseReportProps {
	title: string;
	accounts: IAccount[];
	processFn: AsyncProcessTransactionFn;
	chartFn: (data: ReportDataMap, period: PeriodGroup) => ReactElement;
	showCurrency?: boolean;
	showCompare?: boolean;
	showAccounts?: boolean;
	state?: IReportStateApi;
	renderKpis?: (data: ReportDataMap) => ReactElement;
	extraControls?: ReactElement;
}

const roundCofficient = 1e5;
const roundPoint = (value: number) =>
	Math.round(value * roundCofficient) / roundCofficient;

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
		})();
		return () => {
			cancelled = true;
		};
	}, [moneeeyStore, processFn, period, range, state.currency, accountIds]);

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
					<section className="min-h-[24em]">{chartFn(data, period)}</section>
				) : (
					<section
						data-testid="reportEmpty"
						className="flex min-h-[24em] items-center justify-center text-foreground/60"
					>
						{Messages.reports.no_data}
					</section>
				)}
			</Loading>
		</section>
	);
};
