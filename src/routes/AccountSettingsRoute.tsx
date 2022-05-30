import React from 'react';

import { AccountSettings } from '../app/AccountSettings';
import { AccountType } from '../shared/Account';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IAccountSettingsRoute extends IRouteParameters {}

export class AccountSettingsRouter extends Route<IAccountSettingsRoute> {
  constructor() {
    super('/settings/accounts', HomeRoute);
    this.parent?.addChild(this);
  }

  render(_parameters: IAccountSettingsRoute, app: IAppParameters) {
    return (
      <AccountSettings
        get={() => app.moneeeyStore.accounts.allNonPayees()}
        currencies={app.moneeeyStore.currencies}
        accounts={app.moneeeyStore.accounts}
        type={AccountType.CHECKING}
      />
    );
  }
}

export const AccountSettingsRoute = new AccountSettingsRouter();
