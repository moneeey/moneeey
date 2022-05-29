import React from 'react';

import { CurrencySettings } from '../app/CurrencySettings';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface ICurrencySettingsRoute extends IRouteParameters {

}

export class CurrencySettingsRouter extends Route<ICurrencySettingsRoute> {
  constructor() {
    super('/settings/currencies', HomeRoute);
    this.parent?.addChild(this);
  }

  render(_parameters: ICurrencySettingsRoute, app: IAppParameters) {
    return <CurrencySettings currencies={app.moneeeyStore.currencies.all} />;
  }
}

export const CurrencySettingsRoute = new CurrencySettingsRouter();