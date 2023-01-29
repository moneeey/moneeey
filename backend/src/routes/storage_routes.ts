import express, { Router } from 'express';

import { HandleAuthAPI } from './handle_api';
import AuthController from '../controller/auth_controller';
import StorageController from '../controller/storage_controller';
import { smtp_send } from '../core';
import connect_pouch from '../core/pouch';

const router: Router = express.Router();
const authController = new AuthController(console, connect_pouch, smtp_send);
const storageController = new StorageController(console, connect_pouch, smtp_send);

router.post(
  "/create",
  HandleAuthAPI(authController, (req, _res, user) =>
    storageController.create(user, req.body["description"])
  )
);
router.post(
  '/list',
  HandleAuthAPI(authController, (_req, _res, user) => storageController.list(user))
);
router.post(
  '/destroy',
  HandleAuthAPI(authController, (req, _res, user) => storageController.destroy(user, req.body['database_id']))
);
router.post(
  "/share",
  HandleAuthAPI(authController, (req, _res, user) =>
    storageController.share(
      user,
      req.body["database_id"],
      req.body["toEmail"],
      req.body["level"]
    )
  )
);

export default router;
