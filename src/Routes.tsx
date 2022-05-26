import React, { useEffect } from "react";
import { IAccount } from "./shared/Account";
import Dashboard from "./app/Dashboard";
import { IAppParameters, IRouteParameters, Route } from "./shared/Route";
import TransactionTable from "./app/TransactionTable";
import Landing from "./landing/Landing";
import { Reports } from "./app/Reports";

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Landing
class LandingRouter extends Route<IRouteParameters> {
  constructor() {
    super('', undefined);
  }

  render(_parameters: IRouteParameters, app: IAppParameters) {
    return <Landing />;
  }
}

export const LandingRoute = new LandingRouter();
/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Home
class HomeRouter extends Route<IRouteParameters> {
  constructor() {
    super('', undefined);
  }

  render(_parameters: IRouteParameters, _app: IAppParameters) {
    return <Dashboard />;
  }
}

export const HomeRoute = new HomeRouter();

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Account
interface IAccountRoute extends IRouteParameters {
  account_name: string;
}

class AccountRouter extends Route<IAccountRoute> {
  constructor() {
    super('/accounts/:account_name', HomeRoute);
    this.parent?.addChild(this);
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

export const AccountRoute = new AccountRouter();

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Tags
interface ITagsRoute extends IRouteParameters {
  tag: string;
}

class TagsRouter extends Route<ITagsRoute> {
  constructor() {
    super('/tags/:tag', HomeRoute);
    this.parent?.addChild(this);
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

export const TagsRoute = new TagsRouter();

/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// Reports
interface IReportsRoute extends IRouteParameters {
}

class ReportsRouter extends Route<IReportsRoute> {
  constructor() {
    super('/reports', HomeRoute);
    this.parent?.addChild(this);
  }

  render(_parameters: IReportsRoute, _app: IAppParameters) {
    return <Reports/>;
  }
}

export const ReportsRoute = new ReportsRouter();
