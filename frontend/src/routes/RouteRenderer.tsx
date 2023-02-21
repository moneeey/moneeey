import _ from 'lodash';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

import { IAppParameters, IRouteParameters, Route as MyRoute } from './Route';

interface IMappedRoute {
  path: string;
  route: MyRoute<IRouteParameters>;
}

const RouteElem = observer(({ route, app }: { route: MyRoute<IRouteParameters>; app: IAppParameters }) => {
  const parameters = _.reduce(useParams(), (accum, value, key) => ({ ...accum, [key]: value }), {});

  useEffect(() => {
    action(() => {
      app.moneeeyStore.navigation.currentPath = route.url(parameters);
    })();
  }, []);

  return (
    <aside className='mainArea'>
      <section className='mainAreaInner'>{route.render({ parameters, app })}</section>
    </aside>
  );
});

const RouteRenderer = observer(
  <IParameters extends IRouteParameters>({
    root_route,
    app,
  }: {
    root_route: MyRoute<IParameters>;
    app: IAppParameters;
  }) => {
    const mapRoute = ({ route, path: parentPath }: IMappedRoute): IMappedRoute[] => {
      const path = (parentPath + route.path).replace(/\/+/g, '/');
      const children = route.children.map((child) => mapRoute({ route: child, path }));
      const current: IMappedRoute = { path, route };

      return [..._.flatten(children), current];
    };
    const routes = mapRoute({ route: root_route, path: root_route.path });

    return (
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={<RouteElem route={route.route} app={app} />} />
        ))}
      </Routes>
    );
  }
);

export { RouteRenderer, RouteRenderer as default };
