import express, { Router, Request, Response } from 'express';
import { APP_DESC } from '../core/config';

import authRoutes from './auth_routes';
import storageRoutes from './storage_routes';
import { HandleAPI, HandleAuthAPI } from './handle_api';

const router: Router = express.Router();

router.get("/", async (_: Request, res: Response) => res.send(APP_DESC));

export { router as defaultRoutes, authRoutes, storageRoutes, HandleAPI, HandleAuthAPI };
