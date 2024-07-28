import { compact } from "lodash";
import { observer } from "mobx-react";

import type { IAccount } from "../entities/Account";
import type { ITransaction } from "../entities/Transaction";
import TransactionTable from "../tables/TransactionTable";
import { slugify } from "../utils/Utils";

import useMoneeeyStore from "../shared/useMoneeeyStore";
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
		const { transactions, accounts, currencies } = useMoneeeyStore();
		const account = accounts.find(
			(acc: IAccount) => slugify(acc.name) === account_name,
		);
		const account_uuid = account?.account_uuid || "";
		const filterByAccount = transactions.filterByAccounts(
			compact([account_uuid]),
		);
		const schemaFilter = (row: ITransaction) =>
			account_name === "all" || filterByAccount(row);
		const referenceAccount = account_uuid;

		return (
			<TransactionTable
				tableId={`accountTransactions${account_uuid}`}
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

class AccountRouter extends Route<IAccountRoute> {
	constructor() {
		super("/accounts/:account_name", HomeRoute);
		this.parent?.addChild(this);
	}

	render = ({ parameters }: { parameters: IAccountRoute }) => {
		return <AccountTransactions account_name={parameters.account_name} />;
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
