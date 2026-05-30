import { setupAuth } from "./auth.ts";
import { MONEEEY_ENV, PORT } from "./config.ts";
import { getStorage } from "./data/storage_singleton.ts";
import { oak } from "./deps.ts";
import { purgeStaleTestUsers } from "./janitor.ts";
import { Logger } from "./logger.ts";
import { renderMetrics } from "./metrics.ts";
import { setupVaultSync } from "./sync/vault.ts";

async function ensureMetaInitialized() {
	await getStorage().withMeta(() => Promise.resolve());
}

async function runDevJanitor() {
	if (MONEEEY_ENV !== "dev") return;
	await purgeStaleTestUsers(getStorage());
}

export const serverInternals = {
	ensureMetaInitialized,
	runDevJanitor,
};

export function createServer() {
	const app = new oak.Application();
	const router = new oak.Router();

	router.get("/", ({ response }) => {
		response.body = JSON.stringify({ hello: "Welcome to Moneeey Backend" });
	});
	router.get("/api", ({ response }) => {
		response.body = JSON.stringify({ hello: "Welcome to Moneeey API" });
	});
	router.get("/api/metrics", ({ response }) => {
		response.headers.set("content-type", "text/plain; version=0.0.4");
		response.body = renderMetrics();
	});

	setupAuth(app, router);

	const apiRouter = new oak.Router({ prefix: "/api" });
	setupVaultSync(apiRouter);
	router.use(apiRouter.routes(), apiRouter.allowedMethods());

	app.use(router.routes());
	app.use(router.allowedMethods());
	app.addEventListener("error", (err) => {
		Logger("createServer").error("application error", { err });
	});

	return app;
}

export async function runServer(app: ReturnType<typeof createServer>) {
	await serverInternals.ensureMetaInitialized();
	await serverInternals.runDevJanitor();
	const port = PORT;
	Logger("runServer").info("Moneeey API listening", { port });
	await app.listen({ port });
}
