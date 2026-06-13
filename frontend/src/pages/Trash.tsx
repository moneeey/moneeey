import { observer } from "mobx-react-lite";

import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

const Trash = observer(() => {
	const Messages = useMessages();
	const { accounts, currencies, transactions } = useMoneeeyStore();
	const rows = transactions.trash;

	return (
		<section className="flex grow flex-col gap-3 bg-background-800 p-2 md:p-4">
			<h2 className="text-lg font-semibold">
				{Messages.menu.trash(rows.length)}
			</h2>
			{rows.length === 0 ? (
				<section
					data-testid="trashEmpty"
					className="flex min-h-[18em] items-center justify-center text-foreground/60"
				>
					{Messages.reports.no_data}
				</section>
			) : (
				<div className="overflow-x-auto rounded-md bg-background-900 p-3 md:p-4">
					<table data-testid="trashTable" className="min-w-full text-sm">
						<thead className="text-left opacity-70">
							<tr>
								<th className="px-2 py-1">Split</th>
								<th className="px-2 py-1">{Messages.util.date}</th>
								<th className="px-2 py-1">
									{Messages.transactions.from_account}
								</th>
								<th className="px-2 py-1">
									{Messages.transactions.to_account}
								</th>
								<th className="px-2 py-1 text-right">
									{Messages.transactions.amount}
								</th>
								<th className="px-2 py-1">{Messages.transactions.memo}</th>
								<th className="px-2 py-1">{Messages.util.actions}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const currencyUuid =
									accounts.byUuid(row.from_account)?.currency_uuid || "";
								const grouped = transactions.isVisibleSplitGroup(row, rows);
								return (
									<tr
										key={row.id}
										className={grouped ? "border-l-2 border-secondary-400" : ""}
									>
										<td className="px-2 py-1 text-secondary-200">
											{transactions.splitLabel(row, rows)}
										</td>
										<td className="px-2 py-1 font-mono">{row.date}</td>
										<td className="px-2 py-1">
											{accounts.nameForUuid(row.from_account)}
										</td>
										<td className="px-2 py-1">
											{accounts.nameForUuid(row.to_account)}
										</td>
										<td className="px-2 py-1 text-right font-mono">
											{currencies.formatByUuid(currencyUuid, row.from_value)}
										</td>
										<td className="px-2 py-1">{row.memo}</td>
										<td className="px-2 py-1">
											<button
												type="button"
												data-testid="transactionRestore"
												className="rounded bg-background-800 px-2 py-1 hover:bg-background-700"
												onClick={() => transactions.restoreTransaction(row)}
											>
												{Messages.util.restore}
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
});

export default Trash;
