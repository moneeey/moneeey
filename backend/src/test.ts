import assertStrict from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import sinon from "sinon";
import { loggerInternals } from "./logger.ts";
import { createServer } from "./server.ts";

export { test };

const assertRejects = async (
	fn: () => Promise<unknown> | unknown,
	errClass?: new (...args: never[]) => Error,
	msgIncludes?: string,
): Promise<void> => {
	let error: unknown;
	try {
		await fn();
	} catch (err) {
		error = err;
	}
	assertStrict.ok(error instanceof Error, "expected promise to reject");
	if (errClass) {
		assertStrict.ok(
			error instanceof errClass,
			`expected rejection to be ${errClass.name}`,
		);
	}
	if (msgIncludes) {
		assertStrict.ok(
			(error as Error).message.includes(msgIncludes),
			`expected message to include "${msgIncludes}"`,
		);
	}
};

export const assert: {
	assertEquals: typeof assertStrict.deepStrictEqual;
	assertRejects: typeof assertRejects;
	assertThrows: typeof assertStrict.throws;
	assertExists: typeof assertStrict.ok;
	assert: typeof assertStrict.ok;
} = {
	assertEquals: assertStrict.deepStrictEqual,
	assertRejects,
	assertThrows: assertStrict.throws,
	assertExists: assertStrict.ok,
	assert: assertStrict.ok,
};

type TestResponse = {
	status: number;
	// biome-ignore lint: lint/suspicious/noExplicitAny
	json: () => Promise<any>;
};

const stopServer = (server: Server) =>
	new Promise<void>((resolve) => {
		server.close(() => resolve());
		server.closeAllConnections();
	});

export async function runServerRequest(
	method: string,
	path: string,
	body?: object,
): Promise<{ app: unknown; resp: TestResponse }> {
	const app = createServer();
	const server = app.listen(0) as unknown as Server;
	const address = server.address() as AddressInfo;
	try {
		const resp = await fetch(`http://127.0.0.1:${address.port}${path}`, {
			method,
			body: body ? JSON.stringify(body) : undefined,
			headers: body ? { "content-type": "application/json" } : undefined,
		});
		const status = resp.status;
		const parsed = await resp.json().catch(() => undefined);
		return { app, resp: { status, json: async () => parsed } };
	} finally {
		await stopServer(server);
	}
}

export async function assertResponse(
	resp: TestResponse | undefined,
	status: number,
	response: object,
) {
	assert.assertExists(resp);
	assert.assertEquals(status, resp.status);
	assert.assertEquals(response, await resp.json());
}

export async function withSpying<Object, T>({
	object,
	method,
	action,
	expect,
}: {
	object: Object;
	method: keyof Object;
	expect?: unknown[][];
	action: (stub: sinon.SinonStub) => Promise<T> | T;
}) {
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
