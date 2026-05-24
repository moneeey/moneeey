import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { AccountKind } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import useMessages from "../../utils/Messages";

import KpiCard, { KpiGrid } from "./KpiCard";
import ReportControls, { effectiveAccountIds } from "./ReportControls";
import ReportSunburstChart, {
	type SunburstNode,
} from "./charts/ReportSunburstChart";
import { formatNumber } from "./kpiCalcs";
import { TAG_SEPARATOR, isDescendantOf, normalizeTag } from "./tagHierarchy";
import { ALL_CURRENCIES, useReportState } from "./useReportState";

interface TagAggregate {
	value: number;
	children: Map<string, TagAggregate>;
}

const newAggregate = (): TagAggregate => ({
	value: 0,
	children: new Map(),
});

const insertTag = (
	root: TagAggregate,
	segments: string[],
	value: number,
): void => {
	let node = root;
	for (const segment of segments) {
		let child = node.children.get(segment);
		if (!child) {
			child = newAggregate();
			node.children.set(segment, child);
		}
		child.value += value;
		node = child;
	}
};

const toSunburst = (
	tag: string,
	agg: TagAggregate,
	depth: number,
): SunburstNode => {
	if (agg.children.size === 0) {
		return { id: tag, value: agg.value };
	}
	const children: SunburstNode[] = [];
	for (const [name, child] of agg.children.entries()) {
		const childPath = tag === "root" ? name : `${tag}${TAG_SEPARATOR}${name}`;
		children.push(toSunburst(childPath, child, depth + 1));
	}
	return { id: tag, children };
};

const buildSunburstData = (
	transactions: ITransaction[],
	moneeeyStore: ReturnType<typeof useMoneeeyStore>,
	scope: string | null,
): SunburstNode => {
	const root = newAggregate();
	for (const t of transactions) {
		const fromAct = moneeeyStore.accounts.byUuid(t.from_account);
		const toAct = moneeeyStore.accounts.byUuid(t.to_account);
		const fromIsPayee = fromAct?.kind === AccountKind.PAYEE;
		const toIsPayee = toAct?.kind === AccountKind.PAYEE;
		if (!toIsPayee) continue;
		const payeeSourceTags = moneeeyStore.accounts.accountTags(t.to_account);
		const tags = new Set(
			[...payeeSourceTags, ...t.tags].map(normalizeTag).filter(Boolean),
		);
		if (tags.size === 0) continue;
		const share = Math.abs(t.to_value) / tags.size;
		for (const tag of tags) {
			if (scope && !isDescendantOf(tag, scope)) continue;
			const relative = scope
				? tag.slice(scope.length + TAG_SEPARATOR.length).trim()
				: tag;
			if (!relative) continue;
			const segments = relative.split(TAG_SEPARATOR).filter(Boolean);
			if (segments.length === 0) continue;
			insertTag(root, segments, share);
			void fromIsPayee;
		}
	}
	return toSunburst(scope ?? "root", root, 0);
};

const TagExplorerReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const state = useReportState();
	const { accounts } = moneeeyStore;
	const reportAccounts = accounts.allActive;
	const [scope, setScope] = useState<string | null>(null);

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

	const sunburst = useMemo(
		() => buildSunburstData(transactions, moneeeyStore, scope),
		[transactions, moneeeyStore, scope],
	);

	const totalSpend = useMemo(() => {
		let total = 0;
		const visit = (n: SunburstNode) => {
			if (n.value !== undefined && (!n.children || n.children.length === 0)) {
				total += n.value;
			}
			if (n.children) for (const c of n.children) visit(c);
		};
		visit(sunburst);
		return total;
	}, [sunburst]);

	const topLevel = sunburst.children ?? [];
	const largest = topLevel
		.map((n) => ({
			id: n.id,
			value:
				n.value ??
				(n.children ? n.children.reduce((s, c) => s + (c.value ?? 0), 0) : 0),
		}))
		.sort((a, b) => b.value - a.value)[0];

	const breadcrumbs = scope
		? scope.split(TAG_SEPARATOR).map((segment, idx, arr) => ({
				label: segment,
				path: arr.slice(0, idx + 1).join(TAG_SEPARATOR),
			}))
		: [];

	return (
		<section className="flex grow flex-col gap-3 bg-background-800 p-2 md:p-4">
			<h2 className="text-lg font-semibold">{Messages.reports.tag_explorer}</h2>
			<ReportControls
				state={state}
				accounts={reportAccounts}
				showCompare={false}
			/>
			<nav
				data-testid="tagExplorerBreadcrumbs"
				className="flex flex-wrap items-center gap-1 text-sm"
			>
				<button
					type="button"
					onClick={() => setScope(null)}
					className="rounded px-2 py-1 hover:bg-background-700"
				>
					{Messages.util.all}
				</button>
				{breadcrumbs.map((crumb) => (
					<span key={crumb.path} className="flex items-center gap-1">
						<span className="opacity-50">›</span>
						<button
							type="button"
							onClick={() => setScope(crumb.path)}
							className="rounded px-2 py-1 hover:bg-background-700"
						>
							{crumb.label}
						</button>
					</span>
				))}
			</nav>
			<div data-testid="reportKpis">
				<KpiGrid cols={3}>
					<KpiCard
						testId="kpiTotalSpend"
						label={Messages.reports.kpi_total_change}
						value={formatNumber(totalSpend)}
					/>
					<KpiCard
						testId="kpiCategoryCount"
						label={Messages.reports.kpi_top_tag}
						value={formatNumber(topLevel.length, 0)}
					/>
					<KpiCard
						testId="kpiLargestCategory"
						label={Messages.reports.kpi_top_tag}
						value={largest?.id ?? "—"}
						hint={largest ? formatNumber(largest.value) : ""}
					/>
				</KpiGrid>
			</div>
			{topLevel.length === 0 ? (
				<section
					data-testid="reportEmpty"
					className="flex min-h-[28em] items-center justify-center text-foreground/60"
				>
					{Messages.reports.no_data}
				</section>
			) : (
				<ReportSunburstChart
					data={sunburst}
					onNodeClick={({ path }) => {
						if (path && path !== "root") setScope(path);
					}}
				/>
			)}
		</section>
	);
});

export default TagExplorerReport;
