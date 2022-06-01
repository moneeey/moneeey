import React from 'react';

import { AccountSettings } from '../app/AccountSettings';
import { AccountType } from '../shared/Account';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IPayeeSettingsRoute extends IRouteParameters {}

export class PayeeSettingsRouter extends Route<IPayeeSettingsRoute> {
  constructor() {
    super('/settings/payee', HomeRoute);
    this.parent?.addChild(this);
  }

  render({ app }: { app: IAppParameters }) {
    return (
      <AccountSettings
        entities={app.moneeeyStore.accounts.allPayees()}
        accounts={app.moneeeyStore.accounts}
        currencies={app.moneeeyStore.currencies}
        type={AccountType.PAYEE}
      />
    );
  }
}

export const PayeeSettingsRoute = new PayeeSettingsRouter();
