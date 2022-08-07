import React from 'react';

import Dashboard from '../pages/Dashboard';
import { IRouteParameters, Route } from './Route';

class HomeRouter extends Route<IRouteParameters> {
  constructor() {
    super('/', undefined);
  }

  render() {
    return <Dashboard />;
  }
}

export const HomeRoute = new HomeRouter();
