import Reports, { ReportsHeader } from "../pages/report/Reports";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type IReportsRoute = IRouteParameters;

class ReportsRouter extends Route<IReportsRoute> {
	constructor() {
		super("/reports", HomeRoute);
		this.parent?.addChild(this);
	}

	header() {
		return <ReportsHeader />;
	}

	render() {
		return <Reports />;
	}
}

const ReportsRoute = new ReportsRouter();
export default ReportsRoute;
