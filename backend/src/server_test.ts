import { loggerInternals } from "./logger.ts";
import { createServer, runServer } from "./server.ts";
import {
  assert,
  assertResponse,
  runServerRequest,
  withSpying,
  withSpyingLogger,
} from "./test.ts";

Deno.test(async function root() {
  const { resp } = await runServerRequest("GET", "/");

  assertResponse(resp, 200, {
    hello: "Welcome to Moneeey Backend",
  });
});

Deno.test(async function apiRoot() {
  const { resp } = await runServerRequest("GET", "/api");

  assertResponse(resp, 200, {
    hello: "Welcome to Moneeey API",
  });
});

Deno.test(async function appError() {
  await withSpyingLogger(
    (logger) => {
      const app = createServer();
      app.dispatchEvent(new Event("error"));
      assert.assertEquals(
        logger.args.map(([level, message]) => [level, message]),
        [
          [
            "error",
            "[createServer] application error",
          ],
        ],
      );
    },
  );
});

Deno.test(async function runTheServer() {
  await withSpyingLogger(
    async (logger) => {
      const app = createServer();
      await withSpying({
        object: app,
        method: "listen",
        expect: [
          [
            {
              port: 4269,
            },
          ],
        ],
        action: (stub) => {
          stub.resolves(true);
          runServer(app);
        },
      });

      assert.assertEquals(
        logger.args,
        [
          [
            "info",
            "[runServer] Moneeey API listening",
            { port: 4269 },
          ],
        ],
      );
    },
  );
});

Deno.test(async function loggerEmit() {
  withSpying({
    object: console,
    method: "info",
    expect: [
      ["messagee", '{"solution":42}'],
    ],
    action: () => {
      loggerInternals.emit("info", "messagee", { solution: 42 }, console);
    },
  });
});
