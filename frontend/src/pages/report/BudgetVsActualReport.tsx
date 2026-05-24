import { observer } from "mobx-react";
import { useMemo } from "react";

import type { IBudget } from "../../entities/Budget";
import type { ITransaction } from "../../entities/Transaction";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import useMessages from "../../utils/Messages";

import { BaseReport } from "./BaseReport";
import KpiCard, { KpiGrid } from "./KpiCard";
import {
	type PeriodGroup,
	type ReportDataMap,
	dateToPeriod,
} from "./ReportUtils";
import ReportBarChart from "./charts/ReportBarChart";
import { formatNumber, formatPercent } from "./kpiCalcs";

const ACT_PREFIX = "▮ ";
const ALC_PREFIX = "○ ";

const budgetVsActualProcess =
	(moneeeyStore: MoneeeyStore) =>
	(transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
		if (
			moneeeyStore.accounts.isOffBudget(transaction.from_account) ||
			moneeeyStore.accounts.isOffBudget(transaction.to_account)
		) {
			return;
		}
		const fromTags = moneeeyStore.accounts.accountTags(transaction.from_account);
		const toTags = moneeeyStore.accounts.accountTags(transaction.to_account);
		const allTags = new Set([...fromTags, ...toTags, ...transaction.tags]);

		const budgets = moneeeyStore.budget.all;
		for (const budget of budgets) {
			if (!budget.tags?.some((t) => allTags.has(t))) continue;
			const series = `${ACT_PREFIX}${budget.name || "—"}`;
			const key = dateToPeriod(period, transaction.date);
			const prev = data.points.get(key);
			const prevBalance = prev?.[series] || 0;
			data.columns.add(series);
			data.points.set(key, {
				...prev,
				[series]: prevBalance + transaction.from_value,
			});
		}
	};

const mergeAllocated = (
	data: ReportDataMap,
	budgets: IBudget[],
	period: PeriodGroup,
): ReportDataMap => {
	const nextPoints = new Map(data.points);
	const nextColumns = new Set(data.columns);
	for (const budget of budgets) {
		const series = `${ALC_PREFIX}${budget.name || "—"}`;
		for (const env of budget.envelopes) {
			if (!env.allocated) continue;
			const key = dateToPeriod(period, env.starting);
			const existing = nextPoints.get(key) ?? {};
			nextColumns.add(series);
			nextPoints.set(key, {
				...existing,
				[series]: (existing[series] ?? 0) + env.allocated,
			});
		}
	}
	return { columns: nextColumns, points: nextPoints };
};

const BudgetVsActualReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	const processFn = useMemo(
		() => budgetVsActualProcess(moneeeyStore),
		[moneeeyStore],
	);

	const renderKpis = (data: ReportDataMap) => {
		let totalAllocated = 0;
		let totalActual = 0;
		let overCount = 0;
		const perBudget = new Map<string, { alloc: number; actual: number }>();

		const budgets = moneeeyStore.budget.all;
		for (const budget of budgets) {
			let allocSum = 0;
			for (const env of budget.envelopes) allocSum += env.allocated;
			perBudget.set(budget.name, { alloc: allocSum, actual: 0 });
		}
		for (const record of data.points.values()) {
			for (const [series, value] of Object.entries(record)) {
				if (!series.startsWith(ACT_PREFIX)) continue;
				const budgetName = series.slice(ACT_PREFIX.length);
				const entry = perBudget.get(budgetName) ?? { alloc: 0, actual: 0 };
				entry.actual += value;
				perBudget.set(budgetName, entry);
			}
		}
		for (const { alloc, actual } of perBudget.values()) {
			totalAllocated += alloc;
			totalActual += actual;
			if (alloc > 0 && actual > alloc) overCount += 1;
		}
		const usedRate = totalAllocated > 0 ? totalActual / totalAllocated : 0;

		return (
			<KpiGrid>
				<KpiCard
					testId="kpiTotalAllocated"
					label={Messages.reports.budget_allocated}
					value={formatNumber(totalAllocated)}
				/>
				<KpiCard
					testId="kpiTotalActual"
					label={Messages.reports.budget_actual}
					value={formatNumber(totalActual)}
					tone={totalActual <= totalAllocated ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiBudgetUsage"
					label={Messages.reports.kpi_savings_rate}
					value={formatPercent(usedRate)}
					tone={usedRate <= 1 ? "positive" : "negative"}
				/>
				<KpiCard
					testId="kpiBudgetOver"
					label={Messages.reports.budget_over}
					value={formatNumber(overCount)}
					tone={overCount === 0 ? "positive" : "negative"}
				/>
			</KpiGrid>
		);
	};

	return (
		<BaseReport
			accounts={accounts.allActive.filter((a) => !a.offbudget)}
			processFn={processFn}
			title={Messages.reports.budget_vs_actual}
			renderKpis={renderKpis}
			showAccounts={false}
			chartFn={(data, period, helpers) => (
				<ReportBarChart
					data={mergeAllocated(data, moneeeyStore.budget.all, period)}
					xFormatter={period.formatter}
					stacked={false}
					hiddenSeries={helpers.hiddenSeries}
					onBarClick={helpers.onSeriesClick}
				/>
			)}
		/>
	);
});

export default BudgetVsActualReport;
