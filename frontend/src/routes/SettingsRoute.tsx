import Settings from '../pages/Settings'
import { HomeRoute } from './HomeRouter'
import { IRouteParameters, Route } from './Route'

type ISettingsRoute = IRouteParameters

class SettingsRouter extends Route<ISettingsRoute> {
  constructor() {
    super('/settings', HomeRoute)
    this.parent?.addChild(this)
  }

  render() {
    return <Settings />
  }
}

export const SettingsRoute = new SettingsRouter()