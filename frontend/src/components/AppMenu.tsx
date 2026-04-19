import {
	ArrowDownOnSquareStackIcon,
	Bars3Icon,
	BookOpenIcon,
	BookmarkSlashIcon,
	ChartPieIcon,
	ClipboardDocumentIcon,
	Cog6ToothIcon,
	CurrencyDollarIcon,
	EnvelopeIcon,
	LockClosedIcon,
	UsersIcon,
	WalletIcon,
	WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { observer } from "mobx-react";
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useState,
} from "react";

import type { IAccount } from "../entities/Account";
import AccountRoute from "../routes/AccountRoute";
import { AccountSettingsRoute } from "../routes/AccountSettingsRoute";
import BudgetRoute from "../routes/BudgetRoute";
import { CurrencySettingsRoute } from "../routes/CurrencySettingsRoute";
import HomeRoute from "../routes/HomeRouter";
import ImportRoute from "../routes/ImportRoute";
import { PayeeSettingsRoute } from "../routes/PayeeSettingsRoute";
import ReportsRoute from "../routes/ReportsRoute";
import SettingsRoute from "../routes/SettingsRoute";
import { Status } from "../shared/Persistence";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import { StorageKind, getStorage, setStorage } from "../utils/Utils";

import RouteRenderer, {
	RouteContentRender,
} from "../routes/RouteRenderer";

import useMessages from "../utils/Messages";

import DashboardRoute from "../routes/DashboardRouter";
import { LinkButton } from "./base/Button";
import Icon, { FavIcon } from "./base/Icon";
import Navbar from "./base/Navbar";
import { TextNormal, TextSecondary, TextTitle } from "./base/Text";

const Menu = observer(
	({
		setExpanded,
		expanded,
	}: {
		setExpanded: Dispatch<SetStateAction<boolean>>;
		expanded: boolean;
	}) => {
		const Messages = useMessages();
		const {
			navigation,
			accounts,
			currencies,
			persistence,
			transactions,
			encryption,
		} = useMoneeeyStore();
		const { all: allTransactions } = transactions;

		const allAccountsKey = allTransactions
			.map(({ from_account, to_account }) => `${from_account}_${to_account}`)
			.join("__");

		const getAccountCurrency = (account: IAccount) => {
			const curr = currencies.byUuid(account.currency_uuid);

			return curr?.short || curr?.name || "?";
		};

		const activeAccounts = accounts.allNonPayees.filter(
			(t) => t.archived !== true,
		);
		const unclassified = transactions.viewAllUnclassified().length;
		const activePath = navigation.currentPath;
		const hasTransactions = allTransactions.length > 0;
		const runningBalances = new Map(
			Array.from(transactions.runningBalance.accountBalance.entries()).map(
				([account_uuid, balance]) => [
					account_uuid,
					currencies.formatByUuid(
						accounts.byUuid(account_uuid)?.currency_uuid || "",
						balance,
					),
				],
			),
		);

		const allRunningBalances = Array.from(runningBalances.values()).join("_");

		const isMobile = () => window.innerWidth < 768;

		const routeLink = (url: string) => ({
			onClick: () => {
				navigation.navigate(url);
				if (isMobile()) {
					setExpanded(false);
				}
			},
			isActive: activePath === url,
		});

		return (
			<Navbar
				key={`${allAccountsKey}@@${allRunningBalances}`}
				className="px-2"
				testId="appMenu"
				expanded={expanded}
				onCollapse={() => setExpanded(false)}
				footer={
					<>
						<LinkButton
							compact
							className="flex items-center gap-1 py-0.5 px-2 no-underline hover:bg-background-900 hover:opacity-75 h-6"
							testId="appMenu_sync_status"
							onClick={() => {
								navigation.navigate(SettingsRoute.url());
								if (isMobile()) setExpanded(false);
							}}
							title={`${Messages.modal.sync} ${Messages.menu[`sync_${persistence.status}`]}`}
						>
							<Icon>
								{persistence.status === Status.ONLINE ? (
									<Cog6ToothIcon color="green" />
								) : (
									<Cog6ToothIcon color="red" />
								)}
							</Icon>{" "}
							{expanded
								? `${Messages.modal.sync} ${Messages.menu[`sync_${persistence.status}`]}`
								: ""}
						</LinkButton>
						<LinkButton
							compact
							className="flex items-center gap-1 py-0.5 px-2 no-underline hover:bg-background-900 hover:opacity-75 h-6"
							testId="appMenu_lock"
							onClick={() => encryption.lock()}
							title={Messages.menu.lock}
						>
							<Icon>
								<LockClosedIcon />
							</Icon>{" "}
							{expanded ? Messages.menu.lock : ""}
						</LinkButton>
					</>
				}
				items={[
					{
						key: "dashboard",
						label: Messages.menu.dashboard,
						icon: <ClipboardDocumentIcon />,
						visible: activeAccounts.length > 0,
						...routeLink(DashboardRoute.url()),
					},
					{
						key: "budget",
						label: Messages.menu.budget,
						icon: <EnvelopeIcon />,
						visible: hasTransactions,
						...routeLink(BudgetRoute.url()),
					},
					{
						key: "reports",
						label: Messages.menu.reports,
						icon: <ChartPieIcon />,
						visible: hasTransactions,
						...routeLink(ReportsRoute.url()),
					},
					{
						key: "transactions",
						label: Messages.menu.transactions,
						icon: <CurrencyDollarIcon />,
						visible: activeAccounts.length > 0,
						...routeLink(AccountRoute.accountUrlForAll()),
						isActive: false,
						children: [
							...activeAccounts
								.sort((a, b) => a.currency_uuid?.localeCompare(b.currency_uuid))
								.map((acct) => ({
									key: `account_${acct._id || ""}`,
									label: `${getAccountCurrency(acct)} ${acct.name}`,
									icon: <WalletIcon />,
									customLabel: (
										<TextNormal
											title={Messages.menu.balance(
												runningBalances.get(acct.account_uuid) || "loading",
											)}
										>
											<TextSecondary>{getAccountCurrency(acct)}</TextSecondary>{" "}
											{acct.name}{" "}
											<span className="text-muted text-xs">
												{runningBalances.get(acct.account_uuid)}
											</span>
										</TextNormal>
									),
									...routeLink(AccountRoute.accountUrl(acct)),
								})),
							{
								key: "all",
								icon: <BookOpenIcon />,
								label: Messages.menu.all_transactions,
								...routeLink(AccountRoute.accountUrlForAll()),
							},
							{
								key: "unassigned",
								icon: <BookmarkSlashIcon />,
								label: Messages.menu.unassigned(unclassified),
								visible: unclassified > 0,
								...routeLink(AccountRoute.accountUrlForUnclassified()),
							},
							{
								key: "import",
								icon: <ArrowDownOnSquareStackIcon />,
								label: Messages.menu.import,
								...routeLink(ImportRoute.url()),
							},
						],
					},
					{
						key: "settings",
						label: Messages.menu.settings,
						icon: <Cog6ToothIcon />,
						...routeLink(SettingsRoute.url()),
						isActive: false,
						children: [
							{
								key: "settings_general",
								label: Messages.menu.preferences,
								icon: <WrenchScrewdriverIcon />,
								...routeLink(SettingsRoute.url()),
							},
							{
								key: "settings_currencies",
								label: Messages.menu.currencies,
								icon: <CurrencyDollarIcon />,
								...routeLink(CurrencySettingsRoute.url()),
							},
							{
								key: "settings_accounts",
								label: Messages.menu.accounts,
								icon: <WalletIcon />,
								...routeLink(AccountSettingsRoute.url()),
							},
							{
								key: "settings_payees",
								label: Messages.menu.payees,
								icon: <UsersIcon />,
								...routeLink(PayeeSettingsRoute.url()),
							},
						],
					},
				]}
			/>
		);
	},
);

const Header = observer(
	({
		setExpanded,
		expanded,
	}: {
		setExpanded: Dispatch<SetStateAction<boolean>>;
		expanded: boolean;
	}) => {
		const Messages = useMessages();
		const toggleMenu = () => setExpanded((value) => !value);

		return (
			<header className="sticky left-0 right-0 top-0 z-50 h-12 bg-background-800 flex flex-row items-center">
				<div
					data-expanded={expanded}
					data-testid="toggleMenu"
					onClick={toggleMenu}
					onKeyDown={toggleMenu}
				>
					<TextTitle className="flex flex-row items-center gap-1 text-2xl pl-2">
						<Icon size="lg" className="p-1 rounded hover:ring-1 ring-secondary-200">
							<Bars3Icon />
						</Icon>
						<div className="p-2 flex flex-row gap-2">
							<FavIcon />
							{Messages.menu.title}
						</div>
					</TextTitle>
				</div>
			</header>
		);
	},
);

const Content = ({
	expanded,
	children,
	setExpanded,
}: {
	expanded: boolean;
	setExpanded: Dispatch<SetStateAction<boolean>>;
	children: ReactNode;
}) => (
	<section className="flex grow flex-row">
		<Menu setExpanded={setExpanded} expanded={expanded} />
		<section className="flex grow flex-col p-2 md:p-4 min-h-0">
			{children}
		</section>
	</section>
);

export default observer(function AppMenu() {
	const [expanded, setExpanded] = useState(() => {
		const stored = getStorage("menu_expanded", "", StorageKind.PERMANENT);
		if (stored !== "") {
			return stored === "true";
		}
		return window.innerWidth >= 768;
	});
	useEffect(() => {
		setStorage("menu_expanded", String(expanded), StorageKind.PERMANENT);
	}, [expanded]);

	return (
		<section className="flex h-screen flex-col">
			<RouteRenderer root_route={HomeRoute}>
				{({ route }) => (
					<>
						<Header expanded={expanded} setExpanded={setExpanded} />
						<Content expanded={expanded} setExpanded={setExpanded}>
							<RouteContentRender route={route} />
						</Content>
					</>
				)}
			</RouteRenderer>
		</section>
	);
});
