import cookieParser from "cookie-parser";
import express from "express";
import expressWs from "express-ws";
import { setupAuth } from "./auth.ts";
import { MONEEEY_ENV, PORT } from "./config.ts";
import { getStorage } from "./data/storage_singleton.ts";
import { purgeStaleTestUsers } from "./janitor.ts";
import { Logger } from "./logger.ts";
import { renderMetrics } from "./metrics.ts";
import { setupVaultSync } from "./sync/vault.ts";

async function ensureMetaInitialized() {
	await getStorage().withConn(() => Promise.resolve());
}

async function runDevJanitor() {
	if (MONEEEY_ENV !== "dev") return;
	await purgeStaleTestUsers(getStorage());
}

export const serverInternals = {
	ensureMetaInitialized,
	runDevJanitor,
	handleError: (err: unknown) => {
		Logger("createServer").error("application error", { err });
	},
};

export function createServer() {
	const { app } = expressWs(express());
	app.use(express.json());
	app.use(cookieParser());

	app.get("/", (_req, res) => {
		res.json({ hello: "Welcome to Moneeey Backend" });
	});
	app.get("/api", (_req, res) => {
		res.json({ hello: "Welcome to Moneeey API" });
	});
	app.get("/api/metrics", (_req, res) => {
		res.setHeader("content-type", "text/plain; version=0.0.4");
		res.send(renderMetrics());
	});

	setupAuth(app);
	setupVaultSync(app);

	app.use(
		(
			err: unknown,
			_req: express.Request,
			res: express.Response,
			_next: express.NextFunction,
		) => {
			serverInternals.handleError(err);
			if (!res.headersSent) {
				res.status(500).json({ error: "internal server error" });
			}
		},
	);

	return app;
}

export async function runServer(app: ReturnType<typeof createServer>) {
	await serverInternals.ensureMetaInitialized();
	await serverInternals.runDevJanitor();
	const port = PORT;
	Logger("runServer").info("Moneeey API listening", { port });
	app.listen(port);
}
