import express, { Router, Request, Response } from 'express';
import { APP_DESC } from '../core/config';

import authRoutes from './auth';
import databaseRoutes from './database';

const router: Router = express.Router();

type handler = () => object

const ManageRequest = (res: Response, handle: handler) => {
  try {
    const response = handle()
    res.status(200).send(JSON.stringify(response))
  } catch(e) {
    console.error('ManageRequest', e)
    res.status(500).send('Ops!')
    throw e
  }
}

router.get('/', async (_: Request, res: Response) => res.send(APP_DESC));

export { ManageRequest, router as defaultRoutes, authRoutes, databaseRoutes };
