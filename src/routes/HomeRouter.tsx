import React from 'react';

import Dashboard from '../app/Dashboard';
import { IAppParameters, IRouteParameters, Route } from './Route';

class HomeRouter extends Route<IRouteParameters> {
  constructor() {
    super('/', undefined);
  }

  render(_parameters: IRouteParameters, _app: IAppParameters) {
    return <Dashboard />;
  }
}

export const HomeRoute = new HomeRouter();
