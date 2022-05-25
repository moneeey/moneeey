import express, { Router } from 'express';

import { HandleAPI } from '.';
import AuthController from '../controller/auth_controller';
import { smtp_send } from '../core';
import connect_pouch from '../core/pouch';

const router: Router = express.Router();
const authController = new AuthController(console, connect_pouch, smtp_send)

router.post('/start', HandleAPI((req, _res) => authController.start(req.body['email'].toLowerCase())))
router.post('/check', HandleAPI((req, _res) => authController.check(req.body['email'].toLowerCase(), req.body['auth_code'])))
router.post('/complete', HandleAPI((req, _res) => authController.complete(req.body['email'].toLowerCase(), req.body['auth_code'], req.body['confirm_code'])))
router.post('/logout', HandleAPI((req, _res) => authController.logout(req.body['email'].toLowerCase(), req.body['auth_code'])))

export default router;
