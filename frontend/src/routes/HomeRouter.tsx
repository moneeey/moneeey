import LandingPage from "../components/LandingPage";
import Route, { type IRouteParameters } from "./Route";

class HomeRouter extends Route<IRouteParameters> {
	constructor() {
		super("/", undefined);
	}

	render() {
		return <LandingPage />;
	}
}

const HomeRoute = new HomeRouter();
export default HomeRoute;
