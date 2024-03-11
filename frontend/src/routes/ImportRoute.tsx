import Import from "../pages/import/Import";

import HomeRoute from "./HomeRouter";
import { type IRouteParameters, Route } from "./Route";

type IImportRoute = IRouteParameters;

class ImportRouter extends Route<IImportRoute> {
	constructor() {
		super("/import", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Import />;
	}
}

const ImportRoute = new ImportRouter();
export { ImportRoute as default };
