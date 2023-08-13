import { createServer } from "./server.ts";
import {
  assert,
  assertResponse,
  runServerRequest,
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
    async (logger) => {
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

      return await Promise.resolve();
    },
  );
});
