import { observer } from "mobx-react";
import { useMemo } from "react";

import { AccountKind } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import Select from "../../components/base/Select";
import useMessages from "../../utils/Messages";

import KpiCard, { KpiGrid } from "./KpiCard";
import ReportControls, { effectiveAccountIds } from "./ReportControls";
import ReportSankeyChart, { type SankeyData } from "./charts/ReportSankeyChart";
import { formatNumber } from "./kpiCalcs";
import { normalizeTag, tagAtDepth } from "./tagHierarchy";
import { ALL_CURRENCIES, useReportState } from "./useReportState";

type FlowMode =
	| "income_acct_tag"
	| "income_tag"
	| "acct_tag_subtag"
	| "payee_acct_payee";
const FLOW_KEY = "flow";

const flowLabel = (
	mode: FlowMode,
	Messages: ReturnType<typeof useMessages>,
): string => {
	switch (mode) {
		case "income_acct_tag":
			return Messages.reports.flow_income_acct_tag;
		case "income_tag":
			return Messages.reports.flow_income_tag;
		case "acct_tag_subtag":
			return Messages.reports.flow_acct_tag_subtag;
		case "payee_acct_payee":
			return Messages.reports.flow_payee_acct_payee;
	}
};

const accumulate = (
	bucket: Map<string, number>,
	from: string,
	to: string,
	value: number,
) => {
	if (!from || !to || from === to || value <= 0) return;
	const key = `${from}|${to}`;
	bucket.set(key, (bucket.get(key) || 0) + value);
};

const buildSankey = (
	transactions: ITransaction[],
	mode: FlowMode,
	moneeeyStore: ReturnType<typeof useMoneeeyStore>,
): SankeyData => {
	const edges = new Map<string, number>();
	const accountName = (id: string) =>
		moneeeyStore.accounts.nameForUuid(id) || "(none)";
	const isPayee = (id: string) =>
		moneeeyStore.accounts.byUuid(id)?.kind === AccountKind.PAYEE;

	for (const t of transactions) {
		const fromIsPayee = isPayee(t.from_account);
		const toIsPayee = isPayee(t.to_account);
		const fromName = accountName(t.from_account);
		const toName = accountName(t.to_account);
		const value = Math.abs(t.to_value);
		if (value <= 0) continue;

		switch (mode) {
			case "income_acct_tag": {
				if (fromIsPayee && !toIsPayee) {
					accumulate(edges, fromName, toName, value);
				}
				if (!fromIsPayee && toIsPayee) {
					for (const rawTag of t.tags) {
						const tag = normalizeTag(rawTag);
						if (!tag) continue;
						accumulate(edges, fromName, tag, value / t.tags.length);
					}
					if (t.tags.length === 0) accumulate(edges, fromName, toName, value);
				}
				break;
			}
			case "income_tag": {
				const incomeSource = fromIsPayee ? fromName : "Inflow";
				if (fromIsPayee && !toIsPayee) {
					accumulate(edges, incomeSource, toName, value);
				}
				if (!fromIsPayee && toIsPayee) {
					for (const rawTag of t.tags) {
						const tag = normalizeTag(rawTag);
						if (!tag) continue;
						accumulate(edges, fromName, tag, value / t.tags.length);
					}
					if (t.tags.length === 0) accumulate(edges, fromName, toName, value);
				}
				break;
			}
			case "acct_tag_subtag": {
				if (!fromIsPayee && toIsPayee) {
					for (const rawTag of t.tags) {
						const tag = normalizeTag(rawTag);
						if (!tag) continue;
						const root = tagAtDepth(tag, 1);
						const second = tagAtDepth(tag, 2) ?? root;
						if (root) accumulate(edges, fromName, root, value / t.tags.length);
						if (second && second !== root)
							accumulate(edges, root || "", second, value / t.tags.length);
					}
				}
				break;
			}
			case "payee_acct_payee": {
				if (fromIsPayee && !toIsPayee) {
					accumulate(edges, fromName, toName, value);
				} else if (!fromIsPayee && toIsPayee) {
					accumulate(edges, fromName, toName, value);
				}
				break;
			}
		}
	}

	const nodeSet = new Set<string>();
	const links: { source: string; target: string; value: number }[] = [];
	for (const [key, v] of edges.entries()) {
		const [source, target] = key.split("|");
		nodeSet.add(source);
		nodeSet.add(target);
		links.push({ source, target, value: v });
	}
	return {
		nodes: Array.from(nodeSet).map((id) => ({ id })),
		links,
	};
};

const isFlowMode = (v: string | null): v is FlowMode =>
	v === "income_acct_tag" ||
	v === "income_tag" ||
	v === "acct_tag_subtag" ||
	v === "payee_acct_payee";

const CashFlowReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const state = useReportState();
	const { accounts } = moneeeyStore;
	const reportAccounts = accounts.allActive;

	const rawFlow = state.getExtra(FLOW_KEY);
	const flowMode: FlowMode = isFlowMode(rawFlow) ? rawFlow : "income_acct_tag";

	const accountIdsKey = useMemo(
		() => effectiveAccountIds(reportAccounts, state.accountIds).join(","),
		[reportAccounts, state.accountIds],
	);

	const transactions = useMemo(() => {
		const ids = accountIdsKey ? accountIdsKey.split(",") : [];
		const all = moneeeyStore.transactions.viewAllWithAccounts(ids);
		return all.filter((t) => {
			if (state.from && t.date < state.from) return false;
			if (state.to && t.date > state.to) return false;
			if (state.currency !== ALL_CURRENCIES) {
				const fromAct = moneeeyStore.accounts.byUuid(t.from_account);
				const toAct = moneeeyStore.accounts.byUuid(t.to_account);
				if (
					fromAct?.currency_uuid !== state.currency &&
					toAct?.currency_uuid !== state.currency
				)
					return false;
			}
			return true;
		});
	}, [moneeeyStore, accountIdsKey, state.from, state.to, state.currency]);

	const sankey = useMemo(
		() => buildSankey(transactions, flowMode, moneeeyStore),
		[transactions, flowMode, moneeeyStore],
	);

	const flowOptions = useMemo(
		() =>
			(
				[
					"income_acct_tag",
					"income_tag",
					"acct_tag_subtag",
					"payee_acct_payee",
				] as FlowMode[]
			).map((m) => ({ label: flowLabel(m, Messages), value: m })),
		[Messages],
	);

	const totals = useMemo(() => {
		let inflow = 0;
		let outflow = 0;
		let largest = 0;
		for (const t of transactions) {
			const fromIsPayee =
				moneeeyStore.accounts.byUuid(t.from_account)?.kind ===
				AccountKind.PAYEE;
			const toIsPayee =
				moneeeyStore.accounts.byUuid(t.to_account)?.kind === AccountKind.PAYEE;
			const value = Math.abs(t.to_value);
			if (fromIsPayee && !toIsPayee) inflow += value;
			if (!fromIsPayee && toIsPayee) outflow += value;
			if (value > largest) largest = value;
		}
		return { inflow, outflow, net: inflow - outflow, largest };
	}, [transactions, moneeeyStore]);

	return (
		<section className="flex grow flex-col gap-3 bg-background-800 p-2 md:p-4">
			<h2 className="text-lg font-semibold">{Messages.reports.cash_flow}</h2>
			<ReportControls
				state={state}
				accounts={reportAccounts}
				showCompare={false}
			/>
			<section className="flex flex-wrap items-center gap-3 rounded-md bg-background-900 p-3 md:p-4">
				<span className="text-sm opacity-80">{Messages.reports.flow_mode}</span>
				<div className="w-72">
					<Select
						testId="cashFlowModeSelector"
						placeholder={flowLabel(flowMode, Messages)}
						options={flowOptions}
						value={flowMode}
						onChange={(value) => state.setExtra(FLOW_KEY, value || null)}
					/>
				</div>
			</section>
			<div data-testid="reportKpis">
				<KpiGrid>
					<KpiCard
						testId="kpiTotalInflow"
						label={Messages.reports.total_inflow}
						value={formatNumber(totals.inflow)}
						tone="positive"
					/>
					<KpiCard
						testId="kpiTotalOutflow"
						label={Messages.reports.total_outflow}
						value={formatNumber(totals.outflow)}
						tone="negative"
					/>
					<KpiCard
						testId="kpiNetFlow"
						label={Messages.reports.kpi_net_savings}
						value={formatNumber(totals.net)}
						tone={totals.net >= 0 ? "positive" : "negative"}
					/>
					<KpiCard
						testId="kpiLargestFlow"
						label={Messages.reports.largest_flow}
						value={formatNumber(totals.largest)}
					/>
				</KpiGrid>
			</div>
			{sankey.nodes.length === 0 ? (
				<section
					data-testid="reportEmpty"
					className="flex min-h-[28em] items-center justify-center text-foreground/60"
				>
					{Messages.reports.no_data}
				</section>
			) : (
				<ReportSankeyChart data={sankey} />
			)}
		</section>
	);
});

export default CashFlowReport;
