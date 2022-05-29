import React from 'react';

import { AccountSettings } from '../app/AccountSettings';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IPayeeSettingsRoute extends IRouteParameters {

}

export class PayeeSettingsRouter extends Route<IPayeeSettingsRoute> {
  constructor() {
    super('/settings/payee', HomeRoute);
    this.parent?.addChild(this);
  }

  render(_parameters: IPayeeSettingsRoute, app: IAppParameters) {
    return <AccountSettings accounts={app.moneeeyStore.accounts.allPayees()} currencies={app.moneeeyStore.currencies.all} />;
  }
}

export const PayeeSettingsRoute = new PayeeSettingsRouter();