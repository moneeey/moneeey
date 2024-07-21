import Settings from "../pages/Settings";

import HomeRoute from "./HomeRouter";
import { type IRouteParameters, Route } from "./Route";

type ISettingsRoute = IRouteParameters;

class SettingsRouter extends Route<ISettingsRoute> {
	constructor() {
		super("/settings", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Settings />;
	}
}

const SettingsRoute = new SettingsRouter();
export default SettingsRoute;
