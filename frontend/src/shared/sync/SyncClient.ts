import { getCurrentHost } from "../../utils/Utils";
import type { LocalDoc, LocalStore } from "../storage/LocalStore";

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
	onChanges?: (docs: LocalDoc[]) => void;
	onReconcileDone?: () => void;
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
const DEFAULT_PUSH_BATCH = 50;
const DEFAULT_FETCH_BATCH = 50;
const DEFAULT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export type SyncClientOpts = {
	url: string;
	sessionToken: string;
	localStore: LocalStore;
	events?: SyncEvents;
	wsFactory?: WebSocketFactory;
	pushDebounceMs?: number;
	pushBatchSize?: number;
	fetchBatchSize?: number;
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
	private pendingPush = new Map<string, LocalDoc>();

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

	enqueue(doc: LocalDoc): void {
		this.pendingPush.set(doc.id, doc);
		this.schedulePushFlush();
	}

	async flush(): Promise<void> {
		this.clearPushTimer();
		await this.drainPending();
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
			await this.reconcile();
			this.opts.events?.onReconcileDone?.();
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
			await this.applyChanges(msg.docs as LocalDoc[]);
		}
	}

	private handleClose(event: CloseEvent): void {
		this.ws = null;
		for (const [, pending] of this.pendingRequests) {
			pending.reject(new Error("ws closed"));
		}
		this.pendingRequests.clear();
		if (event.code === 4401 || event.code === 4403) {
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

	private async reconcile(): Promise<void> {
		const entries = await this.opts.localStore.manifest();
		const reply = await this.request({
			type: "manifest",
			entries,
		});
		const pullIds = (reply.pull_ids as string[]) ?? [];
		const pushIds = (reply.push_ids as string[]) ?? [];

		const fetchBatch = this.opts.fetchBatchSize ?? DEFAULT_FETCH_BATCH;
		for (let i = 0; i < pullIds.length; i += fetchBatch) {
			const batch = pullIds.slice(i, i + fetchBatch);
			const fetched = await this.request({ type: "fetch", ids: batch });
			const docs = (fetched.docs as LocalDoc[]) ?? [];
			await this.applyChanges(docs);
		}

		if (pushIds.length > 0) {
			const docs = await this.opts.localStore.getMany(pushIds);
			await this.pushDocs(docs);
		}
		await this.drainPending();
	}

	private async applyChanges(docs: LocalDoc[]): Promise<void> {
		if (docs.length === 0) return;
		await this.opts.localStore.bulkPut(docs);
		this.opts.events?.onChanges?.(docs);
	}

	private schedulePushFlush(): void {
		if (this.pushTimer !== null) return;
		const delay = this.opts.pushDebounceMs ?? DEFAULT_PUSH_DEBOUNCE_MS;
		this.pushTimer = setTimeout(() => {
			this.pushTimer = null;
			this.drainPending().catch(() => {
				/* push errors leave entries in pendingPush; will retry on next trigger */
			});
		}, delay);
	}

	private async drainPending(): Promise<void> {
		if (this.status !== "online") return;
		if (this.pendingPush.size === 0) return;
		const docs = Array.from(this.pendingPush.values());
		this.pendingPush.clear();
		try {
			await this.pushDocs(docs);
		} catch (err) {
			for (const d of docs) {
				if (!this.pendingPush.has(d.id)) this.pendingPush.set(d.id, d);
			}
			throw err;
		}
	}

	private async pushDocs(docs: LocalDoc[]): Promise<void> {
		if (docs.length === 0) return;
		const batchSize = this.opts.pushBatchSize ?? DEFAULT_PUSH_BATCH;
		for (let i = 0; i < docs.length; i += batchSize) {
			const batch = docs.slice(i, i + batchSize);
			await this.request({ type: "push", docs: batch });
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
