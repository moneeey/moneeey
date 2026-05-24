import "fake-indexeddb/auto";
import { type LocalDoc, LocalStore } from "../storage/LocalStore";
import {
	SyncClient,
	type SyncClientOpts,
	type WebSocketLike,
} from "./SyncClient";

const WS_OPEN = 1;
const WS_CLOSED = 3;

class FakeWebSocket implements WebSocketLike {
	readyState = 0;
	onopen: ((e: Event) => void) | null = null;
	onclose: ((e: CloseEvent) => void) | null = null;
	onerror: ((e: Event) => void) | null = null;
	onmessage: ((e: MessageEvent) => void) | null = null;
	sent: Record<string, unknown>[] = [];
	closed: { code?: number; reason?: string } | null = null;

	send(data: string): void {
		this.sent.push(JSON.parse(data));
	}

	close(code?: number, reason?: string): void {
		this.closed = { code, reason };
		this.readyState = WS_CLOSED;
		this.onclose?.({ code: code ?? 1000, reason: reason ?? "" } as CloseEvent);
	}

	simulateOpen(): void {
		this.readyState = WS_OPEN;
		this.onopen?.({} as Event);
	}

	simulateMessage(msg: object): void {
		this.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent);
	}

	simulateClose(code: number, reason = ""): void {
		this.readyState = WS_CLOSED;
		this.onclose?.({ code, reason } as CloseEvent);
	}

	lastByType(type: string): Record<string, unknown> | undefined {
		const matching = this.sent.filter((m) => m.type === type);
		return matching[matching.length - 1];
	}
}

let storeCounter = 0;
const freshStore = async () => {
	storeCounter += 1;
	const s = new LocalStore(`sc-test-${storeCounter}-${Date.now()}`);
	await s.open();
	return s;
};

const flushMicrotasks = async () => {
	for (let i = 0; i < 8; i++) {
		await new Promise<void>((r) => setTimeout(r, 0));
	}
};

const buildClient = async (
	store: LocalStore,
	overrides: Partial<{
		events: SyncClientOpts["events"];
		pushDebounceMs: number;
		pushBatchSize: number;
		fetchBatchSize: number;
	}> = {},
) => {
	const ws = new FakeWebSocket();
	const client = new SyncClient({
		url: "ws://test/api/vault",
		sessionToken: "TOKEN",
		localStore: store,
		wsFactory: () => ws,
		pushDebounceMs: overrides.pushDebounceMs ?? 1,
		pushBatchSize: overrides.pushBatchSize,
		fetchBatchSize: overrides.fetchBatchSize,
		events: overrides.events,
	});
	return { client, ws };
};

const ack = (
	ws: FakeWebSocket,
	type: string,
	body: Record<string, unknown>,
) => {
	const msg = ws.lastByType(type);
	ws.simulateMessage({
		type: `${type}_result`,
		request_id: msg?.request_id,
		...body,
	});
};

describe("SyncClient", () => {
	it("sends hello with token on open", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store);
		try {
			await client.start();
			ws.simulateOpen();
			expect(ws.sent[0]).toEqual({ type: "hello", token: "TOKEN" });
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("on ready: sends manifest then becomes online", async () => {
		const store = await freshStore();
		const statuses: string[] = [];
		const { client, ws } = await buildClient(store, {
			events: { onStatus: (s) => statuses.push(s) },
		});
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1" });
			await flushMicrotasks();
			const manifestMsg = ws.lastByType("manifest");
			expect(manifestMsg).toBeDefined();
			expect(manifestMsg?.entries).toEqual([]);
			expect(await store.getVaultId()).toBe("v1");
			expect(statuses).toContain("online");
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("reconcile: fetches pull_ids and applies them locally", async () => {
		const store = await freshStore();
		const onChanges: LocalDoc[][] = [];
		const { client, ws } = await buildClient(store, {
			events: { onChanges: (docs) => onChanges.push(docs) },
		});
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1" });
			await flushMicrotasks();
			ack(ws, "manifest", { pull_ids: ["a"], push_ids: [] });
			await flushMicrotasks();
			ack(ws, "fetch", {
				docs: [
					{
						id: "a",
						updated_at: "2026-01-01T00:00:00.000Z",
						deleted_at: null,
						data: "cipher",
					},
				],
			});
			await flushMicrotasks();
			expect((await store.get("a"))?.data).toBe("cipher");
			expect(onChanges.length).toBe(1);
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("reconcile: pushes push_ids docs from local", async () => {
		const store = await freshStore();
		await store.put({
			id: "x",
			updated_at: "2026-01-01T00:00:00.000Z",
			deleted_at: null,
			data: "local",
		});
		const { client, ws } = await buildClient(store);
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1" });
			await flushMicrotasks();
			ack(ws, "manifest", { pull_ids: [], push_ids: ["x"] });
			await flushMicrotasks();
			const pushMsg = ws.lastByType("push");
			expect(pushMsg).toBeDefined();
			expect((pushMsg?.docs as Array<{ id: string }> | undefined)?.[0].id).toBe(
				"x",
			);
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("enqueue debounced-pushes to server while online", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store, { pushDebounceMs: 1 });
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1" });
			await flushMicrotasks();
			ack(ws, "manifest", { pull_ids: [], push_ids: [] });
			await flushMicrotasks();
			ws.sent.length = 0;

			client.enqueue({
				id: "x",
				updated_at: "2026-01-01T00:00:00.000Z",
				deleted_at: null,
				data: "cipher",
			});
			await new Promise<void>((r) => setTimeout(r, 5));

			const pushMsg = ws.lastByType("push");
			expect(pushMsg).toBeDefined();
			expect((pushMsg?.docs as Array<{ id: string }> | undefined)?.[0].id).toBe(
				"x",
			);
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("processes inbound changes frames", async () => {
		const store = await freshStore();
		let lastChanges: LocalDoc[] | null = null;
		const { client, ws } = await buildClient(store, {
			events: {
				onChanges: (docs) => {
					lastChanges = docs;
				},
			},
		});
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1" });
			await flushMicrotasks();
			ack(ws, "manifest", { pull_ids: [], push_ids: [] });
			await flushMicrotasks();

			ws.simulateMessage({
				type: "changes",
				docs: [
					{
						id: "y",
						updated_at: "2026-02-01T00:00:00.000Z",
						deleted_at: null,
						data: "broadcast",
					},
				],
			});
			await flushMicrotasks();

			expect((await store.get("y"))?.data).toBe("broadcast");
			expect(lastChanges).not.toBeNull();
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("transitions to denied on 4401 close", async () => {
		const store = await freshStore();
		const statuses: string[] = [];
		const { client, ws } = await buildClient(store, {
			events: { onStatus: (s) => statuses.push(s) },
		});
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateClose(4401, "bad token");
			await flushMicrotasks();
			expect(statuses).toContain("denied");
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("stop closes ws and prevents reconnect", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store);
		try {
			await client.start();
			ws.simulateOpen();
			await client.stop();
			expect(ws.closed).not.toBeNull();
		} finally {
			await store.destroy();
		}
	});

	it("pong messages are accepted silently", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store);
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1" });
			await flushMicrotasks();
			ack(ws, "manifest", { pull_ids: [], push_ids: [] });
			await flushMicrotasks();
			ws.simulateMessage({ type: "pong" });
			expect(client.currentStatus).toBe("online");
		} finally {
			await client.stop();
			await store.destroy();
		}
	});
});
