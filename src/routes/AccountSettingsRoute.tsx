import React from 'react';

import { AccountSettings } from '../app/AccountSettings';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IAccountSettingsRoute extends IRouteParameters {

}

export class AccountSettingsRouter extends Route<IAccountSettingsRoute> {
  constructor() {
    super('/settings/accounts', HomeRoute);
    this.parent?.addChild(this);
  }

  render(_parameters: IAccountSettingsRoute, app: IAppParameters) {
    return <AccountSettings accounts={app.moneeeyStore.accounts.allNonPayees()} currencies={app.moneeeyStore.currencies.all} />;
  }
}

export const AccountSettingsRoute = new AccountSettingsRouter();