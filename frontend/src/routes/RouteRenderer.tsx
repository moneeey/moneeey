import _ from "lodash";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { Route, Routes, useParams } from "react-router-dom";

import type {
	IAppParameters,
	IRouteParameters,
	Route as MyRoute,
} from "./Route";

interface IMappedRoute {
	path: string;
	route: MyRoute<IRouteParameters>;
}

type RouteRender = { route: MyRoute<IRouteParameters>; app: IAppParameters };

export const RouteContentRender = observer(({ route, app }: RouteRender) => {
	const parameters = _.reduce(
		useParams(),
		(accum, value, key) => ({ ...accum, [key]: value }),
		{},
	);

	useEffect(() => {
		app.moneeeyStore.navigation.updateCurrentPath(route.url(parameters));
	}, [route, app, parameters]);

	return <>{route.render({ parameters, app })}</>;
});

export const RouteHeaderRender = observer(({ route, app }: RouteRender) => {
	const parameters = _.reduce(
		useParams(),
		(accum, value, key) => ({ ...accum, [key]: value }),
		{},
	);

	return <>{route.header({ parameters, app })}</>;
});

const RouteRenderer = observer(
	<IParameters extends IRouteParameters>({
		root_route,
		app,
		Component,
	}: {
		root_route: MyRoute<IParameters>;
		app: IAppParameters;
		Component: (props: RouteRender) => React.ReactNode | JSX.Element;
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
						element={<Component route={route.route} app={app} />}
					/>
				))}
				<Route
					index
					key={"index"}
					element={<Component route={root_route} app={app} />}
				/>
			</Routes>
		);
	},
);

export default RouteRenderer;
