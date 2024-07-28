import CurrencyTable from "../tables/CurrencyTable";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type ICurrencySettingsRoute = IRouteParameters;

export class CurrencySettingsRouter extends Route<ICurrencySettingsRoute> {
	constructor() {
		super("/settings/currencies", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <CurrencyTable />;
	}
}

export const CurrencySettingsRoute = new CurrencySettingsRouter();
