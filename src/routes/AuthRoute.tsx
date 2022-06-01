import { IAppParameters, IRouteParameters } from './Route';

export abstract class AuthRoute<IParameters extends IRouteParameters> {
  abstract render(_parameters: IParameters, _app: IAppParameters, user: object): any;
}

export default AuthRoute;
