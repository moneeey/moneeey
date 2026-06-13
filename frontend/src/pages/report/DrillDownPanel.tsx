import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { LinkButton } from "../../components/base/Button";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

export interface DrillDownInfo {
	period: string;
	series: string;
	value: number;
}

interface DrillDownPanelProps {
	info: DrillDownInfo;
	transactions: ITransaction[];
	onClose: () => void;
	periodLabel?: string;
}

const DrillDownPanel = observer(
	({ info, transactions, onClose, periodLabel }: DrillDownPanelProps) => {
		const Messages = useMessages();
		const moneeeyStore = useMoneeeyStore();

		const rows = useMemo(() => {
			return transactions.map((t) => ({
				id: t.id,
				date: t.date,
				from: moneeeyStore.accounts.nameForUuid(t.from_account),
				to: moneeeyStore.accounts.nameForUuid(t.to_account),
				amount: t.to_value,
				memo: t.memo ?? "",
			}));
		}, [transactions, moneeeyStore]);

		return (
			<section
				data-testid="reportDrillDown"
				className="flex flex-col gap-2 rounded-md bg-background-900 p-3 md:p-4"
			>
				<header className="flex items-center justify-between">
					<div className="flex flex-wrap items-baseline gap-2">
						<h3 className="text-base font-semibold">
							{Messages.reports.drilldown_title}
						</h3>
						<span className="text-sm opacity-70">
							{periodLabel ?? info.period} · {info.series}
						</span>
					</div>
					<LinkButton
						compact
						onClick={onClose}
						testId="drillDownClose"
						className="rounded bg-background-800 px-2 py-1 text-sm no-underline hover:bg-background-700"
					>
						{Messages.util.close}
					</LinkButton>
				</header>

				{rows.length === 0 ? (
					<p className="opacity-70">{Messages.reports.no_data}</p>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="text-left opacity-70">
								<tr>
									<th className="px-2 py-1">{Messages.util.date}</th>
									<th className="px-2 py-1">{Messages.reports.from}</th>
									<th className="px-2 py-1">{Messages.reports.to}</th>
									<th className="px-2 py-1 text-right">
										{Messages.transactions.amount}
									</th>
									<th className="px-2 py-1">{Messages.transactions.memo}</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => (
									<tr key={r.id} className="border-t border-background-700/50">
										<td className="px-2 py-1 font-mono">{r.date}</td>
										<td className="px-2 py-1">{r.from}</td>
										<td className="px-2 py-1">{r.to}</td>
										<td className="px-2 py-1 text-right font-mono">
											{r.amount}
										</td>
										<td className="px-2 py-1 opacity-80">{r.memo}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		);
	},
);

export default DrillDownPanel;
