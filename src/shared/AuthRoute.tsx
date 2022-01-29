import { IAppParameters, IRouteParameters } from "./Route";

export abstract class AuthRoute<IParameters extends IRouteParameters> {
  abstract render(_parameters: IParameters, _app: IAppParameters): any;
}

export default AuthRoute;
