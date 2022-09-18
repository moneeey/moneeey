import { Request, Response } from 'express';
import AuthController from '../controller/auth_controller';
import { IUser } from '../entities';

type HandleAPIFn = (req: Request, res: Response) => Promise<object>;
export const HandleAPI = (logger: Console, handle: HandleAPIFn) => {
  return async (req: Request, res: Response) => {
    try {
      const response = await handle(req, res);
      const status = (response as any).status || 200;
      if (status !== 200) {
        logger.warn('HandleAPI non200', { status });
      }
      res.status(status).send(JSON.stringify(response));
    } catch (err) {
      logger.error('HandleAPI', err);
      res.status(500).send('Ops!');
    }
  };
};

type HandleAuthAPIFn = (req: Request, res: Response, user: IUser) => Promise<object>;
export const HandleAuthAPI = (authController: AuthController, handle: HandleAuthAPIFn) =>
  HandleAPI(authController.logger, async (req, res) => {
    const auth_code = ('' + req.headers['authorization']).replace('Bearer ', '');
    const email = ('' + req.headers['email']).toLowerCase();
    try {
      const user = await authController.authenticate(email, auth_code);
      authController.logger.log('handleAuthAPI', { auth_code, email, user });
      if (user) {
        return await handle(req, res, user);
      } else {
        authController.logger.info('HandleAuthAPI unauthorized', { email });
        return { status: 401, error: 'Unauthorized' };
      }
    } catch (err) {
      authController.logger.error('HandleAuthAPI error', { email, err });
      return { status: 500, error: 'Unauthorized' };
    }
  });
