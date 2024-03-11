import Dashboard from "../pages/Dashboard";

import { IRouteParameters, Route } from "./Route";

class HomeRouter extends Route<IRouteParameters> {
	constructor() {
		super("/", undefined);
	}

	render() {
		return <Dashboard />;
	}
}

const HomeRoute = new HomeRouter();
export { HomeRoute as default };
