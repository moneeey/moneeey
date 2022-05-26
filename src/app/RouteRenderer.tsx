import React from "react";
import _ from 'lodash';
import { IAppParameters, IRouteParameters, Route as MyRoute } from "../shared/Route";
import { useNavigate, BrowserRouter, Routes, Route, useParams } from "react-router-dom";

interface IMappedRoute {
      path: string,
      route: MyRoute<IRouteParameters>
}

export default function RouteRenderer<IParameters extends IRouteParameters>({
  root_route,
  app,
}: {
  root_route: MyRoute<IParameters>,
  app: IAppParameters,
}) {
  const mapRoute = ({ route, path: parentPath }: IMappedRoute): IMappedRoute[] => {
    const path = parentPath + route.path;
    const children = route.children.map(child => mapRoute({ route: child, path }));
    const current: IMappedRoute = { path, route };
    return [..._.flatten(children), current];
  };
  const routes = mapRoute({ route: root_route, path: root_route.path });
  const Navigator = () => {
    const navigate = useNavigate();
    app.moneeeyStore.navigation.addListener(url => navigate && navigate(url))
    return <div/>;
  }

  const params = useParams()
  return (
    <BrowserRouter>
      <Routes>
        {routes.map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={<>{route.route.render(params as any, app)}</>}
          />
          ))}
      </Routes>
      <Navigator />
    </BrowserRouter>
  );
}
