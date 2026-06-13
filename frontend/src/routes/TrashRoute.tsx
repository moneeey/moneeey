import Trash from "../pages/Trash";
import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

class TrashRouter extends Route<IRouteParameters> {
	constructor() {
		super("/trash", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return <Trash />;
	}
}

const TrashRoute = new TrashRouter();
export default TrashRoute;
