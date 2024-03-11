import Reports from "../pages/report/Reports";

import HomeRoute from "./HomeRouter";
import { type IRouteParameters, Route } from "./Route";

type IReportsRoute = IRouteParameters;

class ReportsRouter extends Route<IReportsRoute> {
	constructor() {
		super("/reports", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Reports />;
	}
}

const ReportsRoute = new ReportsRouter();
export { ReportsRoute as default };
