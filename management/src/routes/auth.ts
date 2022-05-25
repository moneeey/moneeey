import express, { Router, Request, Response } from 'express';

import { ManageRequest } from '.';
import AuthController from '../controller/auth_controller';
import { smtp_send } from '../core';
import connect_pouch from '../core/pouch';

const router: Router = express.Router();
const authController = new AuthController(console, connect_pouch, smtp_send)

router.post('/start', async (req: Request, res: Response) =>
  ManageRequest(res, () => authController.start(req.body['email'].toLowerCase()))
);

router.post('/check', async (req: Request, res: Response) =>
  ManageRequest(res, () => authController.check(req.body['email'].toLowerCase(), req.body['auth_code']))
);

router.post('/complete', async (req: Request, res: Response) =>
  ManageRequest(res, () => authController.complete(req.body['email'].toLowerCase(), req.body['auth_code'], req.body['confirm_code']))
);

router.post('/logout', async (req: Request, res: Response) =>
  ManageRequest(res, () => authController.logout(req.body['email'].toLowerCase(), req.body['auth_code']))
);

export default router;
