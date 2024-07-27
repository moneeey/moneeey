import _ from "lodash";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { Route, Routes, useParams } from "react-router-dom";

import useMoneeeyStore from "../shared/useMoneeeyStore";
import type MyRoute from "./Route";
import type { IRouteParameters } from "./Route";

interface IMappedRoute {
	path: string;
	route: MyRoute<IRouteParameters>;
}

type RouteRender = { route: MyRoute<IRouteParameters> };

export const RouteContentRender = observer(({ route }: RouteRender) => {
	const { navigation } = useMoneeeyStore();
	const parameters = _.reduce(
		useParams(),
		(accum, value, key) => ({ ...accum, [key]: value }),
		{},
	);

	useEffect(() => {
		navigation.updateCurrentPath(route.url(parameters));
	}, [route, navigation, parameters]);

	return <>{route.render({ parameters })}</>;
});

export const RouteHeaderRender = observer(({ route }: RouteRender) => {
	const parameters = _.reduce(
		useParams(),
		(accum, value, key) => ({ ...accum, [key]: value }),
		{},
	);

	return <>{route.header({ parameters })}</>;
});

const RouteRenderer = observer(
	<IParameters extends IRouteParameters>({
		root_route,
		Component,
	}: {
		root_route: MyRoute<IParameters>;
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
						element={<Component route={route.route} />}
					/>
				))}
				<Route index key={"index"} element={<Component route={root_route} />} />
			</Routes>
		);
	},
);

export default RouteRenderer;
