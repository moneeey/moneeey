import {
	type DocRecord,
	type IncomingDoc,
	type ManifestEntry,
	bulkUpsert,
	getDocs,
	getManifest,
} from "../data/documents.ts";
import { userHasAccess } from "../data/vaults.ts";
import type { Storage } from "../db/engine.ts";
import { authJwt, sessionJwt } from "../jwt.ts";
import { Logger } from "../logger.ts";
import { metrics } from "../metrics.ts";
import type { PeerSink, VaultHub } from "./hub.ts";

const logger = Logger("sync/protocol");

const MAX_MANIFEST_ENTRIES = 50_000;
const MAX_FETCH_IDS = 100;
const MAX_PUSH_DOCS = 100;
const MAX_DATA_BYTES = 256 * 1024;

const KNOWN_MESSAGE_TYPES = new Set([
	"hello",
	"manifest",
	"fetch",
	"push",
	"ping",
]);

export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_FORBIDDEN = 4403;
export const CLOSE_PROTOCOL = 4400;

type HelloMsg = { type: "hello"; token: string };
type ManifestMsg = {
	type: "manifest";
	request_id: string;
	entries: ManifestEntry[];
};
type FetchMsg = { type: "fetch"; request_id: string; ids: string[] };
type PushMsg = { type: "push"; request_id: string; docs: IncomingDoc[] };
type PingMsg = { type: "ping" };
type ClientMsg =
	| HelloMsg
	| ManifestMsg
	| FetchMsg
	| PushMsg
	| PingMsg
	| { type: string };

type ProtocolContext = {
	storage: Storage;
	hub: VaultHub;
	peer: PeerSink;
};

interface MessageHandler {
	handle(msg: ClientMsg): Promise<MessageHandler>;
	onClose(): void;
}

async function validateSessionToken(
	token: string,
): Promise<{ vaultId: string; userId: string; email: string } | null> {
	try {
		const sessionResult = await sessionJwt.validate(token);
		const payload = sessionResult.payload as Record<string, unknown>;
		const vaultId = String(payload.vaultId ?? "");
		const userId = String(payload.userId ?? "");
		const email = String(payload.sub ?? "");
		if (vaultId && userId && email) {
			return { vaultId, userId, email };
		}
	} catch {
		/* try authJwt fallback below */
	}
	try {
		const authResult = await authJwt.validate(token);
		const payload = authResult.payload as Record<string, unknown>;
		const userId = String(payload.userId ?? "");
		const email = String(payload.sub ?? "");
		if (userId && email) {
			return { vaultId: "", userId, email };
		}
	} catch {
		/* fall through */
	}
	return null;
}

const sendError = (
	peer: PeerSink,
	requestId: string | undefined,
	code: string,
	message: string,
) => {
	peer.send({ type: "error", request_id: requestId, code, message });
};

class ClosedHandler implements MessageHandler {
	async handle(): Promise<MessageHandler> {
		return this;
	}
	onClose(): void {
		/* nothing to clean up */
	}
}

class HelloHandler implements MessageHandler {
	constructor(private readonly ctx: ProtocolContext) {}

	async handle(msg: ClientMsg): Promise<MessageHandler> {
		if (msg.type !== "hello") {
			sendError(this.ctx.peer, undefined, "not_ready", "send hello first");
			return this;
		}
		const hello = msg as HelloMsg;
		if (typeof hello.token !== "string" || hello.token.length === 0) {
			this.ctx.peer.close(CLOSE_UNAUTHORIZED, "missing token");
			return new ClosedHandler();
		}
		const claims = await validateSessionToken(hello.token);
		if (!claims) {
			this.ctx.peer.close(CLOSE_UNAUTHORIZED, "invalid token");
			return new ClosedHandler();
		}
		if (!claims.vaultId) {
			this.ctx.peer.close(CLOSE_UNAUTHORIZED, "no vault in token");
			return new ClosedHandler();
		}
		const access = await userHasAccess(
			this.ctx.storage,
			claims.userId,
			claims.vaultId,
		);
		if (!access) {
			this.ctx.peer.close(CLOSE_FORBIDDEN, "not a member of vault");
			return new ClosedHandler();
		}
		const deregister = this.ctx.hub.registerPeer(claims.vaultId, this.ctx.peer);
		this.ctx.peer.send({
			type: "ready",
			vault_id: claims.vaultId,
		});
		return new ReadyHandler(this.ctx, claims.vaultId, deregister);
	}

	onClose(): void {
		/* no hub registration yet */
	}
}

class ReadyHandler implements MessageHandler {
	constructor(
		private readonly ctx: ProtocolContext,
		private readonly vaultId: string,
		private readonly deregister: () => void,
	) {}

	async handle(msg: ClientMsg): Promise<MessageHandler> {
		switch (msg.type) {
			case "hello":
				sendError(
					this.ctx.peer,
					undefined,
					"bad_request",
					"hello already received",
				);
				return this;
			case "ping":
				this.ctx.peer.send({ type: "pong" });
				return this;
			case "manifest": {
				const t = performance.now();
				await this.handleManifest(msg as ManifestMsg);
				metrics.manifestDuration.observe((performance.now() - t) / 1000);
				return this;
			}
			case "fetch": {
				const t = performance.now();
				await this.handleFetch(msg as FetchMsg);
				metrics.fetchDuration.observe((performance.now() - t) / 1000);
				return this;
			}
			case "push": {
				const t = performance.now();
				await this.handlePush(msg as PushMsg);
				metrics.pushDuration.observe((performance.now() - t) / 1000);
				return this;
			}
			default:
				sendError(
					this.ctx.peer,
					undefined,
					"bad_request",
					`unknown type ${msg.type}`,
				);
				return this;
		}
	}

	onClose(): void {
		this.deregister();
	}

	private async handleManifest(msg: ManifestMsg): Promise<void> {
		if (!Array.isArray(msg.entries)) {
			sendError(
				this.ctx.peer,
				msg.request_id,
				"bad_request",
				"entries must be an array",
			);
			return;
		}
		if (msg.entries.length > MAX_MANIFEST_ENTRIES) {
			sendError(
				this.ctx.peer,
				msg.request_id,
				"manifest_too_large",
				`max ${MAX_MANIFEST_ENTRIES} entries`,
			);
			return;
		}
		const serverEntries = await getManifest(this.ctx.storage, this.vaultId);
		const clientByID = new Map<string, string>();
		for (const e of msg.entries) {
			if (typeof e?.id === "string" && typeof e?.updated_at === "string") {
				clientByID.set(e.id, e.updated_at);
			}
		}
		const serverByID = new Map<string, string>();
		for (const e of serverEntries) {
			serverByID.set(e.id, e.updated_at);
		}
		const pull_ids: string[] = [];
		const push_ids: string[] = [];
		for (const [id, serverAt] of serverByID) {
			const clientAt = clientByID.get(id);
			if (clientAt === undefined || serverAt > clientAt) {
				pull_ids.push(id);
			}
		}
		for (const [id, clientAt] of clientByID) {
			const serverAt = serverByID.get(id);
			if (serverAt === undefined || clientAt > serverAt) {
				push_ids.push(id);
			}
		}
		this.ctx.peer.send({
			type: "reconcile_result",
			request_id: msg.request_id,
			pull_ids,
			push_ids,
		});
	}

	private async handleFetch(msg: FetchMsg): Promise<void> {
		if (!Array.isArray(msg.ids)) {
			sendError(
				this.ctx.peer,
				msg.request_id,
				"bad_request",
				"ids must be an array",
			);
			return;
		}
		if (msg.ids.length > MAX_FETCH_IDS) {
			sendError(
				this.ctx.peer,
				msg.request_id,
				"too_many_ids",
				`max ${MAX_FETCH_IDS}`,
			);
			return;
		}
		for (const id of msg.ids) {
			if (typeof id !== "string" || id.length === 0) {
				sendError(this.ctx.peer, msg.request_id, "bad_request", "bad id");
				return;
			}
		}
		const docs = await getDocs(this.ctx.storage, this.vaultId, msg.ids);
		this.ctx.peer.send({
			type: "fetch_result",
			request_id: msg.request_id,
			docs,
		});
	}

	private async handlePush(msg: PushMsg): Promise<void> {
		const incoming = msg.docs;
		if (!Array.isArray(incoming)) {
			sendError(
				this.ctx.peer,
				msg.request_id,
				"bad_request",
				"docs must be an array",
			);
			return;
		}
		if (incoming.length > MAX_PUSH_DOCS) {
			sendError(
				this.ctx.peer,
				msg.request_id,
				"too_many_docs",
				`max ${MAX_PUSH_DOCS}`,
			);
			return;
		}
		for (const d of incoming) {
			if (typeof d?.id !== "string" || d.id.length === 0) {
				sendError(
					this.ctx.peer,
					msg.request_id,
					"bad_request",
					"doc.id required",
				);
				return;
			}
			if (typeof d.data !== "string" || d.data.length > MAX_DATA_BYTES) {
				sendError(
					this.ctx.peer,
					msg.request_id,
					"bad_request",
					"doc.data too large",
				);
				return;
			}
		}
		const results = await bulkUpsert(this.ctx.storage, this.vaultId, incoming);
		this.ctx.peer.send({
			type: "push_result",
			request_id: msg.request_id,
			results,
		});
		const acceptedIds = new Set(
			results.filter((r) => r.status === "accepted").map((r) => r.id),
		);
		metrics.syncPushDocs.inc({}, acceptedIds.size);
		if (acceptedIds.size === 0) return;
		const broadcastDocs: DocRecord[] = incoming
			.filter((d) => acceptedIds.has(d.id))
			.map((d) => ({
				id: d.id,
				updated_at: d.updated_at,
				deleted_at: d.deleted_at,
				data: d.data,
			}));
		this.ctx.hub.broadcast(
			this.vaultId,
			{ type: "changes", docs: broadcastDocs },
			this.ctx.peer,
		);
	}
}

export class VaultProtocol {
	private handler: MessageHandler;
	private readonly ctx: ProtocolContext;

	constructor(storage: Storage, hub: VaultHub, peer: PeerSink) {
		this.ctx = { storage, hub, peer };
		this.handler = new HelloHandler(this.ctx);
	}

	async handleMessage(raw: string): Promise<void> {
		let msg: ClientMsg;
		try {
			msg = JSON.parse(raw) as ClientMsg;
		} catch {
			sendError(this.ctx.peer, undefined, "bad_request", "invalid JSON");
			return;
		}
		const type =
			typeof msg.type === "string" && KNOWN_MESSAGE_TYPES.has(msg.type)
				? msg.type
				: "other";
		metrics.wsMessages.inc({ type });
		try {
			this.handler = await this.handler.handle(msg);
		} catch (err) {
			metrics.errors.inc({ area: "protocol" });
			logger.error("handler error", { err, type: msg.type });
			const requestId = (msg as { request_id?: string }).request_id;
			sendError(
				this.ctx.peer,
				requestId,
				"server_error",
				(err as Error).message,
			);
		}
	}

	handleClose(): void {
		this.handler.onClose();
		this.handler = new ClosedHandler();
	}
}
