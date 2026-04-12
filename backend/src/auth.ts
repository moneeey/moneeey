import { setupCouch } from "./auth_couch.ts";
import { setupPasskey } from "./auth_passkey.ts";
import { oak } from "./deps.ts";

export function setupAuth(_app: oak.Application, router: oak.Router) {
	const authRouter = new oak.Router();

	authRouter.get("/", ({ response }) => {
		response.body = JSON.stringify({ hello: "Welcome to Moneeey AuthAPI" });
	});

	setupPasskey(authRouter);
	setupCouch(authRouter);

	router.use("/api/auth", authRouter.routes(), authRouter.allowedMethods());
}
