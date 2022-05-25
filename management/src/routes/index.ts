import express, { Router, Request, Response } from 'express';
import AuthController from '../controller/auth_controller';
import { APP_DESC } from '../core/config';
import { IUser } from '../entities';

import authRoutes from './auth';
import storageRoutes from './storage';

const router: Router = express.Router();

type HandleAPIFn = (req: Request, res: Response) => object
const HandleAPI = (handle: HandleAPIFn) => {
  return async (req: Request, res: Response) => {
    try {
      const response = handle(req, res)
      res.status(200).send(JSON.stringify(response))
    } catch(e) {
      console.error('HandleAPI', e)
      res.status(500).send('Ops!')
      throw e
    }
  }
}

type HandleAuthAPIFn = (req: Request, res: Response, user: IUser) => object
const HandleAuthAPI = (authController: AuthController, handle: HandleAuthAPIFn) => HandleAPI(async (req, res) => {
  const auth_code = (req.headers['authorization']||'').replace('Bearer ', '')
  const email = (''+req.headers['email']).toLowerCase()
  const user = await authController.authenticate(email, auth_code)
  if (user) {
    handle(req, res, user)
  } else {
    console.error('HandleAuthAPI invalid email/authCode', email)
    res.status(401).send('Unauthorized')
  }
})

router.get('/', async (_: Request, res: Response) => res.send(APP_DESC));

export { HandleAPI, HandleAuthAPI, router as defaultRoutes, authRoutes, storageRoutes };
