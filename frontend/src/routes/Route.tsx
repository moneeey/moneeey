/* eslint-disable line-comment-position */
/* eslint-disable no-inline-comments */
import { ReactNode } from 'react';

import MoneeeyStore from '../shared/MoneeeyStore';

export interface IAppParameters {
  moneeeyStore: MoneeeyStore;
}

export interface IRouteParameters {
  [_index: string]: string;
}

export const slugify = function (string: string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  if (string === '-') {
    return string;
  }

  return encodeURIComponent(
    string
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, '-and-') // Replace & with 'and'
      .replace(/[^\w-]+/g, '') // Remove all non-word characters
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') // Trim - from end of text
  );
};

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
      return url.replace(`:${key}`, slugify(parameters[key]));
    }, this.path);
    if (currentUrl.indexOf(':') >= 0) {
      throw new Error(`Malformed URL: ${currentUrl}`);
    }

    return (parentUrl + currentUrl).replace('//', '/');
  }

  abstract render({ parameters, app }: { parameters: IParameters; app: IAppParameters }): ReactNode;
}
export default Route;
