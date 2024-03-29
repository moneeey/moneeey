import { compact } from "lodash";
import { observer } from "mobx-react";

import type { IAccount } from "../entities/Account";
import type { ITransaction } from "../entities/Transaction";
import type MoneeeyStore from "../shared/MoneeeyStore";
import TransactionTable from "../tables/TransactionTable";
import { slugify } from "../utils/Utils";

import HomeRoute from "./HomeRouter";
import { type IAppParameters, type IRouteParameters, Route } from "./Route";

interface IAccountRoute extends IRouteParameters {
	account_name: string;
}

interface AccountTransactionProps {
	account_name: string;
	moneeyStore: MoneeeyStore;
}

const AccountTransactions = observer(
	({
		account_name,
		moneeyStore: { transactions, accounts, currencies },
	}: AccountTransactionProps) => {
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

	render = ({
		app,
		parameters,
	}: { app: IAppParameters; parameters: IAccountRoute }) => {
		return (
			<AccountTransactions
				account_name={parameters.account_name}
				moneeyStore={app.moneeeyStore}
			/>
		);
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
export { AccountRoute as default };
