import { useMemo } from "react";

import { AccountKind, type TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import type MoneeeyStore from "../../shared/MoneeeyStore";

import Select from "../../components/base/Select";
import useMessages from "../../utils/Messages";

import { BaseReport } from "./BaseReport";
import ReportBarChart from "./charts/ReportBarChart";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";
import {
	normalizeTag,
	tagAtDepth,
	tagDepth as computeTagDepth,
} from "./tagHierarchy";
import { useReportState } from "./useReportState";

type TDepthMode = "1" | "2" | "3" | "all";
const DEPTH_KEY = "depth";

const tagExpensesProcess =
	(moneeeyStore: MoneeeyStore, depthMode: TDepthMode) =>
	(transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
		const sumTransactionTagExpenses = (
			account_uuid: TAccountUUID,
			value: number,
		) => {
			const account = moneeeyStore.accounts.byUuid(account_uuid);
			const is_payee = account?.kind === AccountKind.PAYEE;
			const payee_tags = (is_payee && account?.tags) || [];
			const tags = new Set([...payee_tags, ...transaction.tags]);
			for (const rawTag of tags) {
				const normalized = normalizeTag(rawTag);
				if (!normalized) continue;
				const bucket =
					depthMode === "all"
						? normalized
						: (tagAtDepth(normalized, Number(depthMode)) ??
							tagAtDepth(normalized, computeTagDepth(normalized)) ??
							normalized);
				const key = dateToPeriod(period, transaction.date);
				const prev_record = data.points.get(key);
				const prev_balance = prev_record?.[bucket] || 0;
				const delta = is_payee ? value : -value;
				const balance = prev_balance + delta;
				data.columns.add(bucket);
				data.points.set(key, { ...prev_record, [bucket]: balance });
			}
		};
		sumTransactionTagExpenses(transaction.from_account, transaction.from_value);
		sumTransactionTagExpenses(transaction.to_account, transaction.to_value);
	};

const TagExpensesReport = () => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;
	const state = useReportState();
	const rawDepth = state.getExtra(DEPTH_KEY);
	const depthMode: TDepthMode =
		rawDepth === "1" || rawDepth === "2" || rawDepth === "3" || rawDepth === "all"
			? rawDepth
			: "all";

	const processFn = useMemo(
		() => tagExpensesProcess(moneeeyStore, depthMode),
		[moneeeyStore, depthMode],
	);

	const depthOptions = useMemo(
		() => [
			{ label: "1", value: "1" },
			{ label: "2", value: "2" },
			{ label: "3", value: "3" },
			{ label: Messages.util.all, value: "all" },
		],
		[Messages.util.all],
	);

	const extraControls = (
		<section className="flex items-center gap-3 rounded-md bg-background-900 p-3 md:p-4">
			<span className="text-sm opacity-80">{Messages.reports.tag_depth}</span>
			<div className="w-32">
				<Select
					testId="tagDepthSelector"
					placeholder={depthMode}
					options={depthOptions}
					value={depthMode}
					onChange={(value) => state.setExtra(DEPTH_KEY, value || null)}
				/>
			</div>
		</section>
	);

	return (
		<BaseReport
			state={state}
			accounts={accounts.allPayees}
			processFn={processFn}
			title={Messages.reports.tag_expenses}
			extraControls={extraControls}
			chartFn={(data, period) => (
				<ReportBarChart data={data} xFormatter={period.formatter} />
			)}
		/>
	);
};

export default TagExpensesReport;
