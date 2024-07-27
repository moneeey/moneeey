import Budget, { BudgetHeader } from "../pages/budget/Budget";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type IBudgetRoute = IRouteParameters;

class BudgetRouter extends Route<IBudgetRoute> {
	constructor() {
		super("/budget", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Budget />;
	}

	header() {
		return <BudgetHeader />;
	}
}

const BudgetRoute = new BudgetRouter();
export default BudgetRoute;
