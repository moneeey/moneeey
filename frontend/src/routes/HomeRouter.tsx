import Dashboard from "../pages/Dashboard";

import Route, { type IRouteParameters } from "./Route";

class HomeRouter extends Route<IRouteParameters> {
	constructor() {
		super("/", undefined);
	}

	render() {
		return <Dashboard />;
	}
}

const HomeRoute = new HomeRouter();
export default HomeRoute;
