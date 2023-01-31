import { Request, Response } from 'express';
import AuthController from '../controller/auth_controller';
import { b64decode } from "../core";
import { IUser } from "../entities";

type HandleAPIFn = (req: Request, res: Response) => Promise<object | undefined>;
export const HandleAPI = (logger: Console, handle: HandleAPIFn) => {
  return async (req: Request, res: Response) => {
    try {
      const response = await handle(req, res);
      if (response) {
        const status = (response as any).status || 200;
        if (status !== 200) {
          logger.warn("HandleAPI non200", { status });
        }
        res.status(status);
        res.send(JSON.stringify(response));
      }
    } catch (err) {
      logger.error("HandleAPI", err);
      res.status(500).send("Ops! Internal error.");
    }
  };
};

type HandleAuthAPIFn = (
  req: Request,
  res: Response,
  user: IUser
) => Promise<object | undefined>;
export const HandleAuthAPI = (
  authController: AuthController,
  handle: HandleAuthAPIFn
) =>
  HandleAPI(authController.logger, async (req, res) => {
    const authorization: string = "" + req.headers["authorization"];
    let email;
    let auth_code;
    if (authorization.includes("Bearer")) {
      email = ("" + req.headers["email"]).toLowerCase();
      auth_code = authorization.replace("Bearer ", "");
    } else if (authorization.includes("Basic")) {
      const decoded = b64decode(authorization.replace("Basic ", ""));
      [email, auth_code] = decoded.split(":");
    } else {
      return { status: 500, error: "Unable to read authorization" };
    }
    try {
      const user = await authController.authenticate(email, auth_code);
      if (user) {
        return await handle(req, res, user);
      } else {
        return { status: 401, error: "Unauthorized" };
      }
    } catch (err) {
      authController.logger.error("HandleAuthAPI error", { email, err });
      return { status: 500, error: "Authorization error" };
    }
  });
