import _ from "lodash";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { Route, Routes, useParams } from "react-router-dom";

import type {
	IAppParameters,
	IRouteParameters,
	Route as MyRoute,
} from "./Route";
import { HeaderContent } from "../components/AppMenu";

interface IMappedRoute {
	path: string;
	route: MyRoute<IRouteParameters>;
}

const RouteElem = observer(
	({
		route,
		app,
	}: { route: MyRoute<IRouteParameters>; app: IAppParameters }) => {
		const parameters = _.reduce(
			useParams(),
			(accum, value, key) => ({ ...accum, [key]: value }),
			{},
		);

		useEffect(() => {
			app.moneeeyStore.navigation.updateCurrentPath(route.url(parameters));
		}, [route, app, parameters]);

		return (
			<>
				<HeaderContent key={`${route.path}_${JSON.stringify(parameters)}`}>
					{null}
				</HeaderContent>
				{route.render({ parameters, app })}
			</>
		);
	},
);

const RouteRenderer = observer(
	<IParameters extends IRouteParameters>({
		root_route,
		app,
	}: {
		root_route: MyRoute<IParameters>;
		app: IAppParameters;
	}) => {
		const mapRoute = ({
			route,
			path: parentPath,
		}: IMappedRoute): IMappedRoute[] => {
			const path = (parentPath + route.path).replace(/\/+/g, "/");
			const children = route.children.map((child) =>
				mapRoute({ route: child, path }),
			);
			const current: IMappedRoute = { path, route };

			return [..._.flatten(children), current];
		};
		const routes = mapRoute({ route: root_route, path: root_route.path });

		return (
			<Routes>
				{routes.map((route) => (
					<Route
						key={route.path}
						path={route.path}
						element={<RouteElem route={route.route} app={app} />}
					/>
				))}
				<Route
					index
					key={"index"}
					element={<RouteElem route={root_route} app={app} />}
				/>
			</Routes>
		);
	},
);

export default RouteRenderer;
