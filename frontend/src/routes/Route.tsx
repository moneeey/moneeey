import type { ReactNode } from "react";

import type MoneeeyStore from "../shared/MoneeeyStore";
import { slugify } from "../utils/Utils";

export interface IAppParameters {
	moneeeyStore: MoneeeyStore;
}

export interface IRouteParameters {
	[_index: string]: string;
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
		const parentUrl: string = this.parent?.url(parameters) || "";
		const currentUrl = Object.keys(parameters).reduce((url, key) => {
			return url.replace(`:${key}`, slugify(parameters[key]));
		}, this.path);
		if (currentUrl.indexOf(":") >= 0) {
			throw new Error(`Malformed URL: ${currentUrl}`);
		}

		return (parentUrl + currentUrl).replace("//", "/");
	}

	abstract render({
		parameters,
		app,
	}: { parameters: IParameters; app: IAppParameters }): ReactNode;

	header(_params: {
		parameters: IParameters;
		app: IAppParameters;
	}): null | ReactNode {
		return null;
	}
}
export default Route;
