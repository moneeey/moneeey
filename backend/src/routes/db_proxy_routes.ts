import express, { Router } from "express";

import { HandleAuthAPI } from "./handle_api";
import AuthController from "../controller/auth_controller";
import { smtp_send } from "../core";
import connect_pouch from "../core/pouch";
import DbProxyController from "../controller/db_proxy_controller";

const router: Router = express.Router();
const authController = new AuthController(console, connect_pouch, smtp_send);
const dbProxyController = new DbProxyController(console, connect_pouch);

router.all(
  "/:dbname/*",
  HandleAuthAPI(authController, (req, res, user) =>
    dbProxyController.proxy(user, req.params["dbname"], req, res)
  )
);

export default router;
