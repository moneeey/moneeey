import express, { Router } from "express";

import { HandleAPI } from "./handle_api";
import AuthController from "../controller/auth_controller";
import { mail_send } from "../core";
import connect_pouch from "../core/pouch";

const router: Router = express.Router();
const authController = new AuthController(console, connect_pouch, mail_send);

router.post(
  "/start",
  HandleAPI(authController.logger, (req, _res) =>
    authController.start(req.body["email"].toLowerCase())
  )
);
router.post(
  "/check",
  HandleAPI(authController.logger, (req, _res) =>
    authController.check(req.body["email"].toLowerCase(), req.body["auth_code"])
  )
);
router.post(
  "/complete",
  HandleAPI(authController.logger, (req, _res) =>
    authController.complete(
      req.body["email"].toLowerCase(),
      req.body["auth_code"],
      req.body["confirm_code"]
    )
  )
);
router.post(
  "/logout",
  HandleAPI(authController.logger, (req, _res) =>
    authController.logout(
      req.body["email"].toLowerCase(),
      req.body["auth_code"]
    )
  )
);

export default router;
