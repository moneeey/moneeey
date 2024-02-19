import sinon from "https://cdn.skypack.dev/sinon@11.1.2?dts";
import * as assert from "https://deno.land/std@0.198.0/assert/mod.ts";
import { assertSnapshot } from "https://deno.land/std@0.198.0/testing/snapshot.ts";
import { createServer } from "./server.ts";
import { loggerInternals } from "./logger.ts";

export { assert, assertSnapshot };

export async function runServerRequest(
  method: string,
  path: string,
  body?: object,
) {
  const app = createServer();
  const req = new Request(
    new URL("http://local.moneeey.io:4269" + path),
    {
      body: body && JSON.stringify(body),
      method,
    },
  );
  const resp = await app.handle(req);
  assert.assertExists(resp);
  return {
    app,
    resp,
  };
}

export async function assertResponse(
  resp: Response | undefined,
  status: number,
  response: object,
) {
  assert.assertExists(resp);
  assert.assertEquals(status, resp.status);
  assert.assertEquals(response, await resp.json());
}

export async function withSpying<Object, T>(
  { object, method, action, expect }: {
    object: Object;
    method: keyof Object;
    expect?: unknown[][];
    action: (stub: sinon.SinonStub) => Promise<T> | T;
  },
) {
  const stub = sinon.stub(object, method);
  try {
    await action(stub);
  } finally {
    stub.restore();
    expect && assert.assertEquals(stub.args, expect);
  }
  return stub;
}

export function withSpyingLogger(
  action: (stub: sinon.SinonStub) => Promise<void> | void,
) {
  return withSpying({ object: loggerInternals, method: "emit", action });
}
