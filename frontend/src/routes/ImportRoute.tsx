import Import, { ImportHeader } from "../pages/import/Import";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type IImportRoute = IRouteParameters;

class ImportRouter extends Route<IImportRoute> {
	constructor() {
		super("/import", HomeRoute);
		this.parent?.addChild(this);
	}

	header() {
		return <ImportHeader />;
	}

	render() {
		return <Import />;
	}
}

const ImportRoute = new ImportRouter();
export default ImportRoute;
