import { observer } from "mobx-react";

import type { ITransaction } from "../entities/Transaction";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import TransactionTable from "../tables/TransactionTable";

import useMessages from "../utils/Messages";

import AccountBalanceReport from "./report/AccountBalanceReport";

const RecentTransactions = observer(() => {
	const { transactions, accounts, currencies } = useMoneeeyStore();
	const Messages = useMessages();
	const recent = new Set(
		[...transactions.sorted].splice(0, 5).map((t) => t.transaction_uuid),
	);
	const schemaFilter = (row: ITransaction) => recent.has(row.transaction_uuid);
	const referenceAccount = "";

	return (
		<div className="h-44">
			<b>{Messages.dashboard.recent_transactions}</b>
			<TransactionTable
				tableId="recentTransactions"
				{...{
					transactions,
					accounts,
					currencies,
					schemaFilter,
					referenceAccount,
				}}
				creatable={false}
			/>
		</div>
	);
});

export default function Dashboard() {
	return (
		<div className="flex flex-col gap-4">
			<RecentTransactions />
			<AccountBalanceReport />
		</div>
	);
}
