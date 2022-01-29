import express, { Router, Request, Response } from 'express';

import { ManageRequest } from '.';

const router: Router = express.Router();

router.post('/start', async (req: Request, res: Response) =>
  ManageRequest(res, (mng) => mng.auth_start(req.body['email'].toLowerCase()))
);

router.post('/complete', async (req: Request, res: Response) =>
  ManageRequest(res, (mng) => mng.auth_complete(req.body['email'].toLowerCase(), req.body['confirm_code']))
);

export default router;
