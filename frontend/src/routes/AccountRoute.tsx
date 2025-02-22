import { compact } from "lodash";
import { observer } from "mobx-react";

import { MultiSelect } from "../components/base/Select";
import Space from "../components/base/Space";
import type { IAccount } from "../entities/Account";
import type { ITransaction } from "../entities/Transaction";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import TransactionTable from "../tables/TransactionTable";
import useMessages from "../utils/Messages";
import { slugify } from "../utils/Utils";
import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

interface IAccountRoute extends IRouteParameters {
	account_name: string;
}

interface AccountTransactionProps {
	account_name: string;
}

const AccountTransactions = observer(
	({ account_name }: AccountTransactionProps) => {
		const { transactions, accounts, currencies, navigation } =
			useMoneeeyStore();
		const { globalSearchTags } = navigation;
		const account = accounts.find(
			(acc: IAccount) => slugify(acc.name) === account_name,
		);
		const account_uuid = account?.account_uuid || "";
		const filterByAccount = transactions.filterByAccounts(
			compact([account_uuid]),
		);
		const filterSearch = (row: ITransaction) => {
			if (globalSearchTags.length === 0) return true;
			const searchBuffer = transactions
				.getSearchBuffer(row, accounts)
				.toLowerCase();
			return !!globalSearchTags.find((criteria) =>
				searchBuffer.includes(criteria.toLowerCase()),
			);
		};
		const schemaFilter = (row: ITransaction) => {
			const filterAll = account_name === "all";
			const filterUnassigned =
				account_name === "-" && (!row.from_account || !row.to_account);
			return (
				(filterAll || filterUnassigned || filterByAccount(row)) &&
				filterSearch(row)
			);
		};
		const referenceAccount = account_uuid;

		return (
			<TransactionTable
				tableId={`accountTransactions${account_uuid}__${globalSearchTags.join("_")}`}
				{...{
					transactions,
					accounts,
					currencies,
					schemaFilter,
					referenceAccount,
					account_name,
				}}
			/>
		);
	},
);

const GlobalSearcher = observer(({ account_name }: AccountTransactionProps) => {
	const { navigation, tags, accounts } = useMoneeeyStore();
	const account = accounts.find(
		(acc: IAccount) => slugify(acc.name) === account_name,
	);
	const Messages = useMessages();
	const context = account?.name ?? Messages.menu.all_transactions;
	return (
		<Space className="bg-background-700 py-1 px-2 w-full md:w-1/2">
			<MultiSelect
				testId="globalSearch"
				placeholder={`${Messages.menu.search} ${context.toLowerCase()}`}
				options={tags.all
					.concat(navigation.globalSearchTags)
					.map((t) => ({ label: t, value: t }))}
				value={navigation.globalSearchTags}
				onChange={(new_tags: readonly string[]) =>
					navigation.globalSearch(new_tags as string[])
				}
				onSearch={(search: string) =>
					navigation.globalSearchToggleTags([search])
				}
				createLabel={Messages.menu.search}
			/>
		</Space>
	);
});

class AccountRouter extends Route<IAccountRoute> {
	constructor() {
		super("/accounts/:account_name", HomeRoute);
		this.parent?.addChild(this);
	}

	render = ({ parameters }: { parameters: IAccountRoute }) => {
		return <AccountTransactions account_name={parameters.account_name} />;
	};

	header = ({ parameters }: { parameters: IAccountRoute }) => {
		return <GlobalSearcher account_name={parameters.account_name} />;
	};

	accountUrl(account: IAccount) {
		return this.url({ account_name: account.name });
	}

	accountUrlForName(account_name: string) {
		return this.url({ account_name });
	}

	accountUrlForUnclassified() {
		return this.url({ account_name: "-" });
	}

	accountUrlForAll() {
		return this.url({ account_name: "all" });
	}
}

const AccountRoute = new AccountRouter();
export default AccountRoute;
