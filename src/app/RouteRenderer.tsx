import React from "react";
import * as ReactRouter from "react-router-dom";
import _ from 'lodash';
import Route, { IAppParameters, IRouteParameters } from "../shared/Route";

interface IMappedRoute {
      path: string,
      route: Route<IRouteParameters>
}

export default function RouteRenderer<IParameters extends IRouteParameters>({
  route,
  app,
}: {
  route: Route<IParameters>,
  app: IAppParameters,
}) {
  const mapRoute = ({ route, path: parentPath }: IMappedRoute): IMappedRoute[] => {
    const path = parentPath + route.path;
    const children = route.children.map(child => mapRoute({ route: child, path }));
    const current: IMappedRoute = {
      path,
      route
    };
    return [..._.flatten(children), current];
  };
  const routes = mapRoute({ route, path: route.path });
  const renderComponent = (renderRoute: Route<any>) => {
    return (props: ReactRouter.RouteComponentProps<any>) => {
      return renderRoute.render(props.match.params as any, app);
    }
  }
  const Navigator = () => {
    const history = ReactRouter.useHistory();
    app.moneeeyStore.navigation.addListener(url => {
      history && history.push(url)
    })
    return <div/>;
  }
  return (
    <ReactRouter.BrowserRouter>
      <ReactRouter.Switch>
        {routes.map(route => (
          <ReactRouter.Route
            key={route.path}
            path={route.path}
            exact={true}
            render={renderComponent(route.route)}
          />
          ))}
      </ReactRouter.Switch>
      <Navigator />
    </ReactRouter.BrowserRouter>
  );
}
