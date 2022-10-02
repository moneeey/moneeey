import { CurrencyTable } from '../tables/CurrencyTable'

import HomeRoute from './HomeRouter'
import { IAppParameters, IRouteParameters, Route } from './Route'

type ICurrencySettingsRoute = IRouteParameters

export class CurrencySettingsRouter extends Route<ICurrencySettingsRoute> {
  constructor() {
    super('/settings/currencies', HomeRoute)
    this.parent?.addChild(this)
  }

  render({ app }: { app: IAppParameters }) {
    return <CurrencyTable currencies={app.moneeeyStore.currencies} />
  }
}

export const CurrencySettingsRoute = new CurrencySettingsRouter()
