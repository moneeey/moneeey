import React from 'react';

import { Reports } from '../app/Reports';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface IReportsRoute extends IRouteParameters {

}

class ReportsRouter extends Route<IReportsRoute> {
  constructor() {
    super('/reports', HomeRoute);
    this.parent?.addChild(this);
  }

  render(_parameters: IReportsRoute, _app: IAppParameters) {
    return <Reports />;
  }
}

export const ReportsRoute = new ReportsRouter();
