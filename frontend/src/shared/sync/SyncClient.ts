import { getCurrentHost } from "../../utils/Utils";
import type { LocalDoc, LocalStore, OutboxEntry } from "../storage/LocalStore";

export const wsVaultUrl = (): string =>
	`${getCurrentHost().replace(/^http/, "ws")}/api/vault`;

export type SyncStatus =
	| "offline"
	| "connecting"
	| "online"
	| "denied"
	| "error";

export type SyncEvents = {
	onStatus?: (status: SyncStatus) => void;
	onChanges?: (docs: LocalDoc[], headSeq: number) => void;
	onFirstPullDone?: () => void;
};

export interface WebSocketLike {
	readyState: number;
	onopen: ((event: Event) => void) | null;
	onclose: ((event: CloseEvent) => void) | null;
	onerror: ((event: Event) => void) | null;
	onmessage: ((event: MessageEvent) => void) | null;
	send(data: string): void;
	close(code?: number, reason?: string): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

const DEFAULT_PUSH_DEBOUNCE_MS = 200;
const DEFAULT_PUSH_BATCH = 20;
const DEFAULT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export type SyncClientOpts = {
	url: string;
	sessionToken: string;
	localStore: LocalStore;
	events?: SyncEvents;
	wsFactory?: WebSocketFactory;
	pushDebounceMs?: number;
	pushBatchSize?: number;
	backoffMs?: number[];
};

type PendingRequest = {
	resolve: (msg: Record<string, unknown>) => void;
	reject: (err: Error) => void;
};

const defaultWsFactory: WebSocketFactory = (url) =>
	new WebSocket(url) as unknown as WebSocketLike;

let requestCounter = 0;
const nextRequestId = () => `r-${++requestCounter}`;

export class SyncClient {
	private ws: WebSocketLike | null = null;
	private status: SyncStatus = "offline";
	private pendingRequests = new Map<string, PendingRequest>();
	private pushTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private retryAttempt = 0;
	private intentionallyStopped = false;
	private currentSessionToken: string;

	constructor(private readonly opts: SyncClientOpts) {
		this.currentSessionToken = opts.sessionToken;
	}

	get currentStatus(): SyncStatus {
		return this.status;
	}

	updateSessionToken(token: string): void {
		this.currentSessionToken = token;
	}

	async start(): Promise<void> {
		this.intentionallyStopped = false;
		this.connect();
	}

	async stop(): Promise<void> {
		this.intentionallyStopped = true;
		this.clearReconnectTimer();
		this.clearPushTimer();
		if (this.ws) {
			try {
				this.ws.close(1000, "client stop");
			} catch {
				/* ignore */
			}
			this.ws = null;
		}
		this.setStatus("offline");
		for (const [id, req] of this.pendingRequests) {
			req.reject(new Error(`request ${id} aborted`));
		}
		this.pendingRequests.clear();
	}

	async enqueue(doc: Omit<OutboxEntry, "enqueuedAt">): Promise<void> {
		await this.opts.localStore.outboxAdd({
			...doc,
			enqueuedAt: new Date().toISOString(),
		});
		this.schedulePushFlush();
	}

	async flush(): Promise<void> {
		this.clearPushTimer();
		await this.drainOutbox();
	}

	private connect(): void {
		if (this.ws) return;
		this.setStatus("connecting");
		const factory = this.opts.wsFactory ?? defaultWsFactory;
		const ws = factory(this.opts.url);
		this.ws = ws;
		ws.onopen = () => {
			ws.send(
				JSON.stringify({ type: "hello", token: this.currentSessionToken }),
			);
		};
		ws.onmessage = (event) => {
			this.handleMessage(String(event.data)).catch(() => {
				/* dispatched async work may throw if the connection drops mid-flight; the status flag and reconnect loop handle recovery */
			});
		};
		ws.onclose = (event) => {
			this.handleClose(event);
		};
		ws.onerror = () => {
			this.setStatus("error");
		};
	}

	private async handleMessage(raw: string): Promise<void> {
		let msg: Record<string, unknown>;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		const type = msg.type as string;
		if (type === "ready") {
			this.retryAttempt = 0;
			this.setStatus("online");
			const vaultId = msg.vault_id as string;
			await this.opts.localStore.setVaultId(vaultId);
			await this.runPullLoop();
			await this.drainOutbox();
			this.opts.events?.onFirstPullDone?.();
			return;
		}
		if (type === "pong") return;
		const requestId =
			typeof msg.request_id === "string" ? msg.request_id : undefined;
		if (requestId && this.pendingRequests.has(requestId)) {
			const pending = this.pendingRequests.get(requestId);
			this.pendingRequests.delete(requestId);
			pending?.resolve(msg);
			return;
		}
		if (type === "changes") {
			await this.applyChanges(msg.docs as LocalDoc[], msg.head_seq as number);
		}
	}

	private handleClose(event: CloseEvent): void {
		this.ws = null;
		for (const [, pending] of this.pendingRequests) {
			pending.reject(new Error("ws closed"));
		}
		this.pendingRequests.clear();
		if (event.code === 4401) {
			this.setStatus("denied");
			return;
		}
		if (event.code === 4403) {
			this.setStatus("denied");
			return;
		}
		if (this.intentionallyStopped) {
			this.setStatus("offline");
			return;
		}
		this.setStatus("offline");
		this.scheduleReconnect();
	}

	private scheduleReconnect(): void {
		this.clearReconnectTimer();
		const delays = this.opts.backoffMs ?? DEFAULT_BACKOFF_MS;
		const delay = delays[Math.min(this.retryAttempt, delays.length - 1)];
		this.retryAttempt += 1;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			if (!this.intentionallyStopped) this.connect();
		}, delay);
	}

	private clearReconnectTimer(): void {
		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private clearPushTimer(): void {
		if (this.pushTimer !== null) {
			clearTimeout(this.pushTimer);
			this.pushTimer = null;
		}
	}

	private setStatus(status: SyncStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.opts.events?.onStatus?.(status);
	}

	private async runPullLoop(): Promise<void> {
		let since = await this.opts.localStore.getHeadSeq();
		while (true) {
			const reply = await this.request({
				type: "pull",
				since,
				limit: 500,
			});
			const docs = (reply.docs as LocalDoc[]) ?? [];
			await this.applyChanges(docs, reply.head_seq as number);
			const next = Number(reply.next_since ?? since);
			const done = Boolean(reply.done);
			if (done || next <= since) break;
			since = next;
		}
	}

	private async applyChanges(docs: LocalDoc[], headSeq: number): Promise<void> {
		if (docs.length > 0) {
			await this.opts.localStore.bulkPut(docs);
		}
		const maxSeq = docs.reduce((m, d) => Math.max(m, d.seq), 0);
		const current = await this.opts.localStore.getHeadSeq();
		const newHead = Math.max(current, headSeq, maxSeq);
		if (newHead > current) {
			await this.opts.localStore.setHeadSeq(newHead);
		}
		if (docs.length > 0) {
			this.opts.events?.onChanges?.(docs, newHead);
		}
	}

	private schedulePushFlush(): void {
		if (this.pushTimer !== null) return;
		const delay = this.opts.pushDebounceMs ?? DEFAULT_PUSH_DEBOUNCE_MS;
		this.pushTimer = setTimeout(() => {
			this.pushTimer = null;
			this.drainOutbox().catch(() => {
				/* push errors leave entries in outbox; will retry on next trigger */
			});
		}, delay);
	}

	private async drainOutbox(): Promise<void> {
		if (this.status !== "online") return;
		const all = await this.opts.localStore.outboxList();
		if (all.length === 0) return;
		const batchSize = this.opts.pushBatchSize ?? DEFAULT_PUSH_BATCH;
		for (let i = 0; i < all.length; i += batchSize) {
			const batch = all.slice(i, i + batchSize);
			const reply = await this.request({
				type: "push",
				docs: batch.map(({ enqueuedAt: _e, ...doc }) => doc),
			});
			const results =
				(reply.results as Array<{
					id: string;
					status: string;
					seq?: number;
				}>) ?? [];
			for (const r of results) {
				if (r.status === "accepted") {
					const entry = batch.find((b) => b._id === r.id);
					if (entry && typeof r.seq === "number") {
						await this.opts.localStore.put({
							_id: entry._id,
							seq: r.seq,
							updated: entry.updated,
							deletedAt: entry.deletedAt,
							data: entry.data,
						});
						const current = await this.opts.localStore.getHeadSeq();
						if (r.seq > current) {
							await this.opts.localStore.setHeadSeq(r.seq);
						}
					}
					await this.opts.localStore.outboxRemove(r.id);
				} else if (r.status === "stale") {
					await this.opts.localStore.outboxRemove(r.id);
					await this.refetchSingleDoc(r.id);
				}
			}
		}
	}

	private async refetchSingleDoc(id: string): Promise<void> {
		const local = await this.opts.localStore.get(id);
		const since = local ? Math.max(0, local.seq - 1) : 0;
		const reply = await this.request({ type: "pull", since, limit: 500 });
		const docs = (reply.docs as LocalDoc[]) ?? [];
		const match = docs.find((d) => d._id === id);
		if (match) {
			await this.applyChanges([match], reply.head_seq as number);
		}
	}

	private request(
		body: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const requestId = nextRequestId();
		return new Promise((resolve, reject) => {
			if (!this.ws) {
				reject(new Error("not connected"));
				return;
			}
			this.pendingRequests.set(requestId, { resolve, reject });
			try {
				this.ws.send(JSON.stringify({ ...body, request_id: requestId }));
			} catch (err) {
				this.pendingRequests.delete(requestId);
				reject(err as Error);
			}
		});
	}
}
