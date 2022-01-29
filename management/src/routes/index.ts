import * as Bacon from 'baconjs';
import express, { Router, Request, Response } from 'express';

import { APP_DESC } from '../core';
import { Management } from '../management';
import authRoutes from './auth';
import databaseRoutes from './database';

const router: Router = express.Router();

const ManageRequest = (res: Response, cb: (mng: Management) => void) =>
  Bacon.once(new Management())
    .flatMap((mng) => cb(mng))
    .onValue((response) => res.status(200).send(response));

router.get('/', async (_: Request, res: Response) => res.send(APP_DESC));

export { ManageRequest, router as defaultRoutes, authRoutes, databaseRoutes };
