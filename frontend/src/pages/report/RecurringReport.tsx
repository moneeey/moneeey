import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { AccountKind, type TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { parseDate } from "../../utils/Date";

import useMessages from "../../utils/Messages";

import KpiCard, { KpiGrid } from "./KpiCard";
import ReportControls, { effectiveAccountIds } from "./ReportControls";
import { formatNumber } from "./kpiCalcs";
import { ALL_CURRENCIES, useReportState } from "./useReportState";

const median = (values: number[]): number => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
};

const daysBetween = (a: string, b: string): number => {
	const ms = parseDate(b).getTime() - parseDate(a).getTime();
	return ms / (1000 * 60 * 60 * 24);
};

interface RecurringRow {
	payeeId: TAccountUUID;
	payeeName: string;
	transactions: ITransaction[];
	medianGapDays: number;
	totalSpent: number;
	monthlyEstimate: number;
	lastDate: string;
	trend: "up" | "down" | "flat";
}

const detectRecurring = (
	transactions: ITransaction[],
	payees: Map<string, string>,
): RecurringRow[] => {
	const byPayee = new Map<TAccountUUID, ITransaction[]>();
	for (const t of transactions) {
		const payeeName = payees.get(t.to_account);
		if (!payeeName) continue;
		const list = byPayee.get(t.to_account) ?? [];
		list.push(t);
		byPayee.set(t.to_account, list);
	}

	const rows: RecurringRow[] = [];
	for (const [payeeId, txs] of byPayee.entries()) {
		if (txs.length < 3) continue;
		const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
		const gaps: number[] = [];
		for (let i = 1; i < sorted.length; i += 1) {
			gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
		}
		const med = median(gaps);
		if (med <= 0 || med > 366) continue;
		const tolerance = med * 0.2;
		const consistent = gaps.every((g) => Math.abs(g - med) <= tolerance);
		if (!consistent) continue;

		const totalSpent = sorted.reduce((sum, t) => sum + t.to_value, 0);
		const monthlyEstimate = (totalSpent / (sorted.length * med)) * 30;
		const half = Math.floor(sorted.length / 2);
		const firstHalfAvg =
			sorted.slice(0, half).reduce((s, t) => s + t.to_value, 0) /
			Math.max(half, 1);
		const lastHalfAvg =
			sorted.slice(-half).reduce((s, t) => s + t.to_value, 0) /
			Math.max(half, 1);
		const trend: RecurringRow["trend"] =
			lastHalfAvg > firstHalfAvg * 1.1
				? "up"
				: lastHalfAvg < firstHalfAvg * 0.9
					? "down"
					: "flat";

		rows.push({
			payeeId,
			payeeName: payees.get(payeeId) ?? "",
			transactions: sorted,
			medianGapDays: med,
			totalSpent,
			monthlyEstimate,
			lastDate: sorted[sorted.length - 1].date,
			trend,
		});
	}

	rows.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
	return rows;
};

const trendArrow = (trend: RecurringRow["trend"]): string => {
	switch (trend) {
		case "up":
			return "↑";
		case "down":
			return "↓";
		default:
			return "→";
	}
};

const RecurringReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const state = useReportState();
	const { accounts } = moneeeyStore;

	const allReportAccounts = accounts.allActive;

	const accountIdsKey = useMemo(
		() => effectiveAccountIds(allReportAccounts, state.accountIds).join(","),
		[allReportAccounts, state.accountIds],
	);

	const filteredTransactions = useMemo(() => {
		const ids = accountIdsKey ? accountIdsKey.split(",") : [];
		const all = moneeeyStore.transactions.viewAllWithAccounts(ids);
		return all.filter((t) => {
			if (state.from && t.date < state.from) return false;
			if (state.to && t.date > state.to) return false;
			if (state.currency !== ALL_CURRENCIES) {
				const fromAct = moneeeyStore.accounts.byUuid(t.from_account);
				const toAct = moneeeyStore.accounts.byUuid(t.to_account);
				const matches =
					fromAct?.currency_uuid === state.currency ||
					toAct?.currency_uuid === state.currency;
				if (!matches) return false;
			}
			return true;
		});
	}, [moneeeyStore, accountIdsKey, state.from, state.to, state.currency]);

	const recurring = useMemo(() => {
		const payeeNames = new Map<string, string>();
		for (const acct of accounts.all) {
			if (acct.kind === AccountKind.PAYEE) payeeNames.set(acct.id, acct.name);
		}
		return detectRecurring(filteredTransactions, payeeNames);
	}, [filteredTransactions, accounts.all]);

	const monthlyTotal = recurring.reduce((s, r) => s + r.monthlyEstimate, 0);
	const largest = recurring[0];

	return (
		<section className="flex grow flex-col gap-3 bg-background-800 p-2 md:p-4">
			<h2 className="text-lg font-semibold">{Messages.reports.recurring}</h2>
			<ReportControls
				state={state}
				accounts={allReportAccounts}
				showCompare={false}
			/>
			{recurring.length > 0 && (
				<div data-testid="reportKpis">
					<KpiGrid>
						<KpiCard
							testId="kpiRecurringMonthly"
							label={Messages.reports.recurring_monthly}
							value={formatNumber(monthlyTotal)}
						/>
						<KpiCard
							testId="kpiRecurringCount"
							label={Messages.reports.recurring_count}
							value={formatNumber(recurring.length, 0)}
						/>
						<KpiCard
							testId="kpiRecurringLargest"
							label={Messages.reports.recurring_largest}
							value={largest?.payeeName ?? "—"}
							hint={largest ? formatNumber(largest.monthlyEstimate) : ""}
						/>
						<KpiCard
							testId="kpiRecurringTotal"
							label={Messages.reports.kpi_total_change}
							value={formatNumber(
								recurring.reduce((s, r) => s + r.totalSpent, 0),
							)}
						/>
					</KpiGrid>
				</div>
			)}
			{recurring.length === 0 ? (
				<section
					data-testid="reportEmpty"
					className="flex min-h-[18em] items-center justify-center text-foreground/60"
				>
					{Messages.reports.no_data}
				</section>
			) : (
				<div
					data-testid="recurringTable"
					className="overflow-x-auto rounded-md bg-background-900 p-3 md:p-4"
				>
					<table className="min-w-full text-sm">
						<thead className="text-left opacity-70">
							<tr>
								<th className="px-2 py-1">{Messages.transactions.account}</th>
								<th className="px-2 py-1 text-right">
									{Messages.reports.recurring_monthly}
								</th>
								<th className="px-2 py-1 text-right">
									{Messages.reports.kpi_total_change}
								</th>
								<th className="px-2 py-1 text-right">
									{Messages.util.created}
								</th>
								<th className="px-2 py-1 text-center">
									{Messages.reports.kpi_avg_per_period}
								</th>
							</tr>
						</thead>
						<tbody>
							{recurring.map((r) => (
								<tr
									key={r.payeeId}
									className="border-t border-background-700/50"
								>
									<td className="px-2 py-1">{r.payeeName}</td>
									<td className="px-2 py-1 text-right font-mono">
										{formatNumber(r.monthlyEstimate)}
									</td>
									<td className="px-2 py-1 text-right font-mono">
										{formatNumber(r.totalSpent)}
									</td>
									<td className="px-2 py-1 text-right font-mono">
										{r.lastDate}
									</td>
									<td className="px-2 py-1 text-center text-base">
										{trendArrow(r.trend)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
});

export default RecurringReport;
