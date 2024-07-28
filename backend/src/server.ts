import { setupAuth } from "./auth.ts";
import { PORT } from "./config.ts";
import { oak } from "./deps.ts";
import { Logger } from "./logger.ts";

export function createServer() {
	const app = new oak.Application();
	const router = new oak.Router();

	router.get("/", ({ response }) => {
		response.body = JSON.stringify({ hello: "Welcome to Moneeey Backend" });
	});
	router.get("/api", ({ response }) => {
		response.body = JSON.stringify({ hello: "Welcome to Moneeey API" });
	});

	setupAuth(app, router);

	app.use(router.routes());
	app.use(router.allowedMethods());
	app.addEventListener("error", (err) => {
		Logger("createServer").error("application error", { err });
	});

	return app;
}

export async function runServer(app: ReturnType<typeof createServer>) {
	const port = PORT;
	Logger("runServer").info("Moneeey API listening", { port });
	await app.listen({ port });
}
