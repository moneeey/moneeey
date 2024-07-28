import Sync from "../pages/Sync";
import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type ISyncRoute = IRouteParameters;

class SyncRouter extends Route<ISyncRoute> {
	constructor() {
		super("/sync", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Sync />;
	}
}

const SyncRoute = new SyncRouter();
export default SyncRoute;
