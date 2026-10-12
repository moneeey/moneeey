import express from "express";
import { setupMembership } from "./auth_membership.ts";
import { setupPasskey } from "./auth_passkey.ts";
import { setupSession } from "./auth_session.ts";

export function setupAuth(app: express.Express) {
	const authRouter = express.Router();

	authRouter.get("/", (_req, res) => {
		res.json({ hello: "Welcome to Moneeey AuthAPI" });
	});

	setupPasskey(authRouter);
	setupSession(authRouter);
	setupMembership(authRouter);

	app.use("/api/auth", authRouter);
}
