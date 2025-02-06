import { compact } from "lodash";
import { observer } from "mobx-react";

import type { IAccount } from "../entities/Account";
import type { ITransaction } from "../entities/Transaction";
import TransactionTable from "../tables/TransactionTable";
import { slugify } from "../utils/Utils";

import useMoneeeyStore from "../shared/useMoneeeyStore";
import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";
import { MultiSelect } from "../components/base/Select";
import Space from "../components/base/Space";
import useMessages from "../utils/Messages";
import { Input } from "../components/base/Input";

interface IAccountRoute extends IRouteParameters {
	account_name: string;
}

interface AccountTransactionProps {
	account_name: string;
}

const AccountTransactions = observer(
	({ account_name }: AccountTransactionProps) => {
		const { transactions, accounts, currencies, navigation } = useMoneeeyStore();
    const { globalSearchTags, globalSearchText } = navigation
		const account = accounts.find(
			(acc: IAccount) => slugify(acc.name) === account_name,
		);
		const account_uuid = account?.account_uuid || "";
		const filterByAccount = transactions.filterByAccounts(
			compact([account_uuid]),
		);
		const schemaFilter = (row: ITransaction) =>
			(account_name === "all" ||
			(account_name === "-" && (!row.from_account || !row.to_account)) ||
			filterByAccount(row)) &&
      (globalSearchTags.length === 0 || !!transactions.getAllTransactionTags(row, accounts).find(transactionTag => globalSearchTags.includes(transactionTag))) &&
      (globalSearchText.length === 0 || !!transactions.getSearchBuffer(row, accounts).toLowerCase().includes(globalSearchText.toLowerCase()));
		const referenceAccount = account_uuid;

		return (
			<TransactionTable
				tableId={`accountTransactions${account_uuid}__${globalSearchTags.join('_')}__${globalSearchText}`}
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

const GlobalSearcher = observer(() => {
  const { navigation, tags } = useMoneeeyStore()
  const Messages = useMessages()
  return <Space className="bg-background-700 py-1 px-2 g-2">
    <MultiSelect
      testId="globalSearchTags"
      placeholder={Messages.util.global_search_tags}
      options={tags.all.map((t) => ({ label: t, value: t }))}
      value={navigation.globalSearchTags}
      onChange={(new_tags: readonly string[]) =>
        navigation.globalSearch(navigation.globalSearchText, new_tags as string[])
      }
    />
    <Input
      testId="globalSearchText"
      placeholder={Messages.util.global_search_text}
      value={navigation.globalSearchText}
      onChange={(search) =>
        navigation.globalSearch(search, navigation.globalSearchTags)}
    />
  </Space>

  })


class AccountRouter extends Route<IAccountRoute> {
	constructor() {
		super("/accounts/:account_name", HomeRoute);
		this.parent?.addChild(this);
	}

	render = ({ parameters }: { parameters: IAccountRoute }) => {
		return <AccountTransactions account_name={parameters.account_name} />;
	};

  header = () => {
    return <GlobalSearcher />
  }

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
