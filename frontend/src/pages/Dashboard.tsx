import {
	ArrowDownTrayIcon,
	BanknotesIcon,
	CreditCardIcon,
	PlusIcon,
} from "@heroicons/react/24/outline";
import { observer } from "mobx-react-lite";

import Card from "../components/base/Card";
import Icon from "../components/base/Icon";
import {
	type ITransaction,
	isActiveTransaction,
} from "../entities/Transaction";
import { NavigationModal } from "../shared/Navigation";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import TransactionTable from "../tables/TransactionTable";
import useMessages from "../utils/Messages";
import AccountBalanceReport from "./report/AccountBalanceReport";
import KpiCard, { KpiGrid } from "./report/KpiCard";

const QuickActionBar = observer(() => {
	const { navigation } = useMoneeeyStore();
	const Messages = useMessages();

	return (
		<div className="flex flex-wrap items-center gap-2">
			<button
				type="button"
				data-testid="dashboardNewTxBtn"
				onClick={() => navigation.openModal(NavigationModal.NEW_TRANSACTION)}
				className="inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors"
			>
				<Icon size="sm">
					<PlusIcon className="w-4 h-4" />
				</Icon>
				<span>{Messages.dashboard.new_transaction}</span>
			</button>
			<button
				type="button"
				onClick={() => navigation.navigate("/accounts")}
				className="inline-flex items-center gap-2 rounded-xl border border-background-700/80 bg-background-800/80 hover:bg-background-700/80 px-3.5 py-2 text-sm font-medium text-foreground transition-colors"
			>
				<Icon size="sm">
					<CreditCardIcon className="w-4 h-4" />
				</Icon>
				<span>{Messages.menu.accounts}</span>
			</button>
			<button
				type="button"
				onClick={() => navigation.navigate("/import")}
				className="inline-flex items-center gap-2 rounded-xl border border-background-700/80 bg-background-800/80 hover:bg-background-700/80 px-3.5 py-2 text-sm font-medium text-foreground transition-colors"
			>
				<Icon size="sm">
					<ArrowDownTrayIcon className="w-4 h-4" />
				</Icon>
				<span>{Messages.menu.import}</span>
			</button>
			<button
				type="button"
				onClick={() => navigation.navigate("/reports")}
				className="inline-flex items-center gap-2 rounded-xl border border-background-700/80 bg-background-800/80 hover:bg-background-700/80 px-3.5 py-2 text-sm font-medium text-foreground transition-colors"
			>
				<Icon size="sm">
					<BanknotesIcon className="w-4 h-4" />
				</Icon>
				<span>{Messages.menu.reports}</span>
			</button>
		</div>
	);
});

const DashboardKpis = observer(() => {
	const { accounts, transactions, currencies } = useMoneeeyStore();
	const Messages = useMessages();

	const activeAccounts = accounts.allNonPayees.filter((a) => !a.archived);
	const activeTransactions = transactions.all.filter(isActiveTransaction);
	const uniqueCurrencies = new Set(
		activeAccounts.map((a) => a.currency_uuid).filter(Boolean),
	);

	return (
		<KpiGrid cols={3}>
			<KpiCard
				testId="dashboardKpiAccounts"
				label={Messages.dashboard.total_accounts}
				value={activeAccounts.length}
				hint={`${accounts.allPayees.length} ${Messages.menu.payees.toLowerCase()}`}
				tone="neutral"
			/>
			<KpiCard
				testId="dashboardKpiTransactions"
				label={Messages.dashboard.total_transactions}
				value={activeTransactions.length}
				tone="neutral"
			/>
			<KpiCard
				testId="dashboardKpiCurrencies"
				label={Messages.dashboard.active_currencies}
				value={uniqueCurrencies.size || currencies.all.length}
				tone="info"
			/>
		</KpiGrid>
	);
});

const RecentTransactions = observer(() => {
	const { transactions, accounts, currencies, navigation } = useMoneeeyStore();
	const Messages = useMessages();
	const recent = new Set(
		[...transactions.sorted].splice(0, 5).map((t) => t.id),
	);
	const schemaFilter = (row: ITransaction) => recent.has(row.id);
	const referenceAccount = "";

	return (
		<Card
			variant="default"
			padding="none"
			header={
				<div className="flex items-center justify-between px-4 py-3 border-b border-background-700/60">
					<span className="text-base font-semibold text-foreground">
						{Messages.dashboard.recent_transactions}
					</span>
					<button
						type="button"
						onClick={() => navigation.navigate("/transactions")}
						className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
					>
						{Messages.dashboard.view_all} →
					</button>
				</div>
			}
		>
			<div className="h-[32rem]">
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
		</Card>
	);
});

export default function Dashboard() {
	return (
		<div className="flex flex-col gap-6">
			<QuickActionBar />
			<DashboardKpis />
			<RecentTransactions />
			<AccountBalanceReport />
		</div>
	);
}
