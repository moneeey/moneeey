import { loggerInternals } from "./logger.ts";
import { createServer, runServer, serverInternals } from "./server.ts";
import {
	assert,
	assertResponse,
	runServerRequest,
	test,
	withSpying,
	withSpyingLogger,
} from "./test.ts";

test(async function root() {
	const { resp } = await runServerRequest("GET", "/");

	assertResponse(resp, 200, {
		hello: "Welcome to Moneeey Backend",
	});
});

test(async function apiRoot() {
	const { resp } = await runServerRequest("GET", "/api");

	assertResponse(resp, 200, {
		hello: "Welcome to Moneeey API",
	});
});

test(async function appError() {
	await withSpyingLogger((logger) => {
		serverInternals.handleError(new Error("boom"));
		assert.assertEquals(
			logger.args.map(([level, message]) => [level, message]),
			[["error", "[createServer] application error"]],
		);
	});
});

test(async function runTheServer() {
	await withSpying({
		object: serverInternals,
		method: "ensureMetaInitialized",
		action: async (ensureStub) => {
			ensureStub.resolves();
			await withSpying({
				object: serverInternals,
				method: "runDevJanitor",
				action: async (janitorStub) => {
					janitorStub.resolves();
					await withSpyingLogger(async (logger) => {
						const app = createServer();
						await withSpying({
							object: app,
							method: "listen",
							expect: [[4269]],
							action: async (stub) => {
								stub.resolves(true);
								await runServer(app);
							},
						});

						assert.assertEquals(logger.args, [
							["info", "[runServer] Moneeey API listening", { port: 4269 }],
						]);
					});
				},
			});
		},
	});
});

test(async function loggerEmit() {
	withSpying({
		object: console,
		method: "info",
		expect: [["messagee", '{"solution":42}']],
		action: () => {
			loggerInternals.emit("info", "messagee", { solution: 42 }, console);
		},
	});
});
