import React from 'react';

import { AccountTable } from '../tables/AccountTable';
import { AccountType } from '../entities/Account';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IAccountSettingsRoute extends IRouteParameters {}

export class AccountSettingsRouter extends Route<IAccountSettingsRoute> {
  constructor() {
    super('/settings/accounts', HomeRoute);
    this.parent?.addChild(this);
  }

  render({ app }: { app: IAppParameters }) {
    return (
      <AccountTable
        currencies={app.moneeeyStore.currencies}
        accounts={app.moneeeyStore.accounts}
        type={AccountType.CHECKING}
      />
    );
  }
}

export const AccountSettingsRoute = new AccountSettingsRouter();
