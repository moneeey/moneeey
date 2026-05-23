import "fake-indexeddb/auto";
import { LocalStore } from "../storage/LocalStore";
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

	lastRequestId(type?: string): string | undefined {
		const matching = type
			? this.sent.filter((m) => m.type === type)
			: this.sent;
		const last = matching[matching.length - 1] as
			| { request_id?: string }
			| undefined;
		return last?.request_id;
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
	await new Promise<void>((r) => setTimeout(r, 0));
	await new Promise<void>((r) => setTimeout(r, 0));
};

const buildClient = async (
	store: LocalStore,
	overrides: Partial<{
		events: SyncClientOpts["events"];
		pushDebounceMs: number;
		pushBatchSize: number;
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
		events: overrides.events,
	});
	return { client, ws };
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

	it("becomes online and pulls from head_seq after ready", async () => {
		const store = await freshStore();
		await store.setHeadSeq(5);
		const statuses: string[] = [];
		const { client, ws } = await buildClient(store, {
			events: { onStatus: (s) => statuses.push(s) },
		});
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1", head_seq: 5 });
			await flushMicrotasks();
			const pullMsg = ws.sent.find((m) => m.type === "pull") as {
				since: number;
			} | undefined;
			expect(pullMsg?.since).toBe(5);
			expect(await store.getVaultId()).toBe("v1");
			expect(statuses).toContain("online");
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("applies pulled docs to the local store", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store);
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1", head_seq: 0 });
			await flushMicrotasks();
			const pullId = ws.lastRequestId("pull");
			ws.simulateMessage({
				type: "pull_result",
				request_id: pullId,
				docs: [
					{
						_id: "a",
						seq: 1,
						updated: "2026-01-01T00:00:00Z",
						deletedAt: null,
						data: "cipher",
					},
				],
				next_since: 1,
				done: true,
				head_seq: 1,
			});
			await flushMicrotasks();
			const stored = await store.get("a");
			expect(stored?.data).toBe("cipher");
			expect(await store.getHeadSeq()).toBe(1);
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("enqueue stores in outbox and drains on push debounce", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store, { pushDebounceMs: 1 });
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1", head_seq: 0 });
			await flushMicrotasks();
			ws.sent.length = 0;

			await client.enqueue({
				_id: "x",
				updated: "2026-01-01T00:00:00Z",
				deletedAt: null,
				data: "cipher",
			});
			await new Promise<void>((r) => setTimeout(r, 5));

			const pushMsg = ws.sent.find((m) => m.type === "push") as
				| { docs: Array<{ _id: string }>; request_id: string }
				| undefined;
			expect(pushMsg).toBeDefined();
			expect(pushMsg?.docs[0]._id).toBe("x");

			ws.simulateMessage({
				type: "push_result",
				request_id: pushMsg?.request_id,
				results: [{ id: "x", status: "accepted", seq: 7 }],
			});
			await flushMicrotasks();

			const stored = await store.get("x");
			expect(stored?.seq).toBe(7);
			expect(await store.getHeadSeq()).toBe(7);
			expect((await store.outboxList()).length).toBe(0);
		} finally {
			await client.stop();
			await store.destroy();
		}
	});

	it("processes inbound changes frames", async () => {
		const store = await freshStore();
		const received: number[] = [];
		const { client, ws } = await buildClient(store, {
			events: {
				onChanges: (docs, head) => {
					received.push(head);
				},
			},
		});
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1", head_seq: 0 });
			await flushMicrotasks();
			ws.simulateMessage({
				type: "pull_result",
				request_id: ws.lastRequestId("pull"),
				docs: [],
				next_since: 0,
				done: true,
				head_seq: 0,
			});
			await flushMicrotasks();

			ws.simulateMessage({
				type: "changes",
				docs: [
					{
						_id: "y",
						seq: 4,
						updated: "2026-02-01T00:00:00Z",
						deletedAt: null,
						data: "broadcast",
					},
				],
				head_seq: 4,
			});
			await flushMicrotasks();

			expect((await store.get("y"))?.data).toBe("broadcast");
			expect(received).toEqual([4]);
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

	it("stale push entries are removed from outbox", async () => {
		const store = await freshStore();
		const { client, ws } = await buildClient(store, { pushDebounceMs: 1 });
		try {
			await client.start();
			ws.simulateOpen();
			ws.simulateMessage({ type: "ready", vault_id: "v1", head_seq: 0 });
			await flushMicrotasks();
			ws.sent.length = 0;
			await client.enqueue({
				_id: "old",
				updated: "2026-01-01T00:00:00Z",
				deletedAt: null,
				data: "stale",
			});
			await new Promise<void>((r) => setTimeout(r, 5));
			const pushId = ws.lastRequestId("push");
			ws.simulateMessage({
				type: "push_result",
				request_id: pushId,
				results: [{ id: "old", status: "stale", currentSeq: 10 }],
			});
			await flushMicrotasks();
			const refetchId = ws.lastRequestId("pull");
			ws.simulateMessage({
				type: "pull_result",
				request_id: refetchId,
				docs: [
					{
						_id: "old",
						seq: 10,
						updated: "2026-03-01T00:00:00Z",
						deletedAt: null,
						data: "winner",
					},
				],
				next_since: 10,
				done: true,
				head_seq: 10,
			});
			await flushMicrotasks();
			expect((await store.outboxList()).length).toBe(0);
			const stored = await store.get("old");
			expect(stored?.data).toBe("winner");
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
			ws.simulateMessage({ type: "ready", vault_id: "v1", head_seq: 0 });
			ws.simulateMessage({ type: "pong" });
			expect(client.currentStatus).toBe("online");
		} finally {
			await client.stop();
			await store.destroy();
		}
	});
});
