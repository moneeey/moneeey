import _ from 'lodash';
import { observer } from 'mobx-react';
import React from 'react';
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';

import { IAppParameters, IRouteParameters, Route as MyRoute } from '../routes/Route';

interface IMappedRoute {
  path: string;
  route: MyRoute<IRouteParameters>;
}

export default function RouteRenderer<IParameters extends IRouteParameters>({
  root_route,
  app
}: {
  root_route: MyRoute<IParameters>;
  app: IAppParameters;
}) {
  const mapRoute = ({ route, path: parentPath }: IMappedRoute): IMappedRoute[] => {
    const path = parentPath + route.path;
    const children = route.children.map((child) => mapRoute({ route: child, path }));
    const current: IMappedRoute = { path, route };
    return [..._.flatten(children), current];
  };
  const routes = mapRoute({ route: root_route, path: root_route.path });

  const Navigator = () => {
    const navigate = useNavigate();
    const Navigate = observer(() => {
      const toUrl = app.moneeeyStore.navigation.navigateTo;
      if (toUrl) {
        navigate(toUrl);
        app.moneeeyStore.navigation.navigate('');
      }
      return <div />;
    });
    return <Navigate />;
  };

  const params = useParams();
  return (
    <BrowserRouter>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={<>{route.route.render(params as any, app)}</>} />
        ))}
      </Routes>
      <Navigator />
    </BrowserRouter>
  );
}
