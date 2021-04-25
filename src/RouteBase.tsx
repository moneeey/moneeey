import React from "react";
import MoneeeyStore from "./MoneeeyStore";
import * as ReactRouter from "react-router-dom";
import _ from 'lodash';
import { Observe } from "./Observable";

export interface IAppParameters {
  moneeeyStore: MoneeeyStore;
}

export interface IRouteParameters {
  [_index: string]: string;
}

function slugify(string: string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return string.toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

export abstract class Route<IParameters extends IRouteParameters> {
  path: string;
  parent?: Route<IRouteParameters>;
  children: Array<Route<IRouteParameters>> = [];

  constructor(path: string, parent?: Route<IRouteParameters>) {
    this.path = path;
    this.parent = parent;
  }

  addChild(route: Route<IParameters>) {
    this.children = [...this.children, route];
  }

  url(parameters: IParameters = {} as IParameters) {
    const parentUrl: string = (this.parent && this.parent.url(parameters)) || '';
    const currentUrl = Object.keys(parameters).reduce((url, key) => {
      return url.replace(':' + key, this.slug(parameters[key]));
    }, this.path);
    if (currentUrl.indexOf(':') >= 0) {
      alert('Malformed URL: ' + currentUrl);
    }
    return parentUrl + currentUrl;
  }

  slug(value: string) {
    return encodeURIComponent(slugify(value));
  }

  abstract render(_parameters: IParameters, _app: IAppParameters): any;
}

interface IMappedRoute {
      path: string,
      route: Route<IRouteParameters>
}

export function RouteRenderer<IParameters extends IRouteParameters>({
  route,
  app
}: {
  route: Route<IParameters>,
  app: IAppParameters
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
    app.moneeeyStore.navigation.addObserver(url => history && history.push(url));
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
