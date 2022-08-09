import { Reports } from '../pages/Reports'
import { HomeRoute } from './HomeRouter'
import { IRouteParameters, Route } from './Route'

type IReportsRoute = IRouteParameters

class ReportsRouter extends Route<IReportsRoute> {
  constructor() {
    super('/reports', HomeRoute)
    this.parent?.addChild(this)
  }

  render() {
    return <Reports />
  }
}

export const ReportsRoute = new ReportsRouter()
