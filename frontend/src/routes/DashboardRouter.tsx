import Dashboard from "../pages/Dashboard";
import HomeRoute from "./HomeRouter";

import Route, { type IRouteParameters } from "./Route";

class DashboardRouter extends Route<IRouteParameters> {
	constructor() {
		super("/dashboard", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Dashboard />;
	}
}

const DashboardRoute = new DashboardRouter();
export default DashboardRoute;
