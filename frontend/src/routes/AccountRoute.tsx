import React from 'react';
import { observer } from 'mobx-react';

import TransactionTable from '../tables/TransactionTable';
import { IAccount } from '../shared/Account';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';
import { ITransaction } from '../shared/Transaction';
import MoneeeyStore from '../shared/MoneeeyStore';

interface IAccountRoute extends IRouteParameters {
  account_name: string;
}

interface AccountTransactionProps {
  account_name: string;
  slug: (value: string) => string;
  moneeyStore: MoneeeyStore;
}

const AccountTransactions = observer(({ slug, account_name, moneeyStore: { transactions, accounts, currencies } }: AccountTransactionProps) => {
    const account = accounts.find((acc: IAccount) => slug(acc.name) === account_name);
    if (account) {
      const { account_uuid } = account;
      const filterByAccount = transactions.filterByAccounts([account_uuid])
      const schemaFilter = (_sp: any, row: ITransaction) => filterByAccount(row)
      const referenceAccount = account_uuid
      return <TransactionTable {...{ transactions, accounts, currencies, schemaFilter, referenceAccount }} />;
    }
    return <p>Account {account_name} not found</p>;
})

class AccountRouter extends Route<IAccountRoute> {
  constructor() {
    super('/accounts/:account_name', HomeRoute);
    this.parent?.addChild(this);
  }

  render = ({ app, parameters }: { app: IAppParameters, parameters: IAccountRoute }) => {
    return <AccountTransactions slug={this.slug} account_name={parameters.account_name} moneeyStore={app.moneeeyStore} />
  }

  accountUrl(account: IAccount) {
    return this.url({ account_name: account.name });
  }
}

export const AccountRoute = new AccountRouter();
