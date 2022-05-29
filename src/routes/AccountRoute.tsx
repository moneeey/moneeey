import React from 'react';

import TransactionTable from '../app/TransactionTable';
import { IAccount } from '../shared/Account';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IAccountRoute extends IRouteParameters {
  account_name: string;
}

class AccountRouter extends Route<IAccountRoute> {
  constructor() {
    super('/accounts/:account_name', HomeRoute);
    this.parent?.addChild(this);
  }

  render(parameters: IAccountRoute, app: IAppParameters) {
    const account = app.moneeeyStore.accounts.find((acc: IAccount) => this.slug(acc.name) === parameters.account_name);
    if (account) {
      const { account_uuid } = account;
      const transactions = app.moneeeyStore.transactions.viewAllWithAccount(account_uuid);
      return <TransactionTable transactions={transactions} referenceAccount={account_uuid} />;
    }
    return <p>Account {parameters.account_name} not found</p>;
  }

  accountUrl(account: IAccount) {
    return this.url({ account_name: account.name });
  }
}

export const AccountRoute = new AccountRouter();
