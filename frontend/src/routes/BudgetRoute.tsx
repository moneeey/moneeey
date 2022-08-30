import Budget from '../pages/budget/Budget'
import { HomeRoute } from './HomeRouter'
import { IRouteParameters, Route } from './Route'

type IBudgetRoute = IRouteParameters

class BudgetRouter extends Route<IBudgetRoute> {
  constructor() {
    super('/budget', HomeRoute)
    this.parent?.addChild(this)
  }

  render() {
    return <Budget />
  }
}

export const BudgetRoute = new BudgetRouter()
