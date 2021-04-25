import React from "react";
import { IAccount } from "./Account";
import Dashboard from "./Dashboard";
import _ from 'lodash';
import { IAppParameters, IRouteParameters, Route } from "./RouteBase";
import TransactionTable from "./TransactionTable";

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Home
class HomeRoute extends Route<IRouteParameters> {
  constructor() {
    super('', undefined);
  }

  render(_parameters: IRouteParameters, _app: IAppParameters) {
    return <Dashboard />;
  }
}

export const Home = new HomeRoute();

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Account
interface IAccountRoute extends IRouteParameters {
  account_name: string;
}

class AccountRoute extends Route<IAccountRoute> {
  constructor(parent: Route<IRouteParameters>) {
    super('/accounts/:account_name', parent);
    parent.addChild(this);
  }

  render(parameters: IAccountRoute, app: IAppParameters) {
    const accounts = app
      .moneeeyStore
      .accounts
      .byPredicate((acc: IAccount) => this.slug(acc.name) === parameters.account_name);
    if (accounts.length === 1) {
      const account = accounts[0];
      const { account_uuid } = account;
      const transactions = app.moneeeyStore.transactions.viewAllWithAccount(account_uuid);
      return <TransactionTable transactions={transactions} referenceAccount={account_uuid} />;
    }
    return <p>Account {parameters.account_name} not found</p>
  }

  accountUrl(account: IAccount) {
    return this.url({ account_name: account.name });
  }
}

export const Account = new AccountRoute(Home);

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Tags
interface ITagsRoute extends IRouteParameters {
  tag: string;
}

class TagsRoute extends Route<ITagsRoute> {
  constructor(parent: Route<IRouteParameters>) {
    super('/tags/:tag', parent);
    parent.addChild(this);
  }

  render(parameters: ITagsRoute, app: IAppParameters) {
    const transactions = app
      .moneeeyStore
      .transactions
      .viewAllWithTag(parameters.tag, app.moneeeyStore.accounts);
    return <TransactionTable transactions={transactions} referenceAccount={""} />;
  }

  tagsUrl(tag: string) {
    return this.url({ tag });
  }
}

export const Tags = new TagsRoute(Home);
