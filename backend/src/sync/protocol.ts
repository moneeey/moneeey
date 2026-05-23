import type { Storage } from "../db/storage.ts";
import {
	type DocRecord,
	type IncomingDoc,
	bulkUpsert,
	getHeadSeq,
	getSince,
} from "../data/documents.ts";
import { userHasAccess } from "../data/vaults.ts";
import { authJwt, sessionJwt } from "../jwt.ts";
import { Logger } from "../logger.ts";
import type { PeerSink, VaultHub } from "./hub.ts";

const logger = Logger("sync/protocol");

const MAX_PULL_LIMIT = 500;
const MAX_PUSH_DOCS = 100;
const MAX_DATA_BYTES = 256 * 1024;

export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_FORBIDDEN = 4403;
export const CLOSE_PROTOCOL = 4400;

type HelloMsg = { type: "hello"; token: string };
type PullMsg = {
	type: "pull";
	request_id: string;
	since: number;
	limit?: number;
};
type PushMsg = { type: "push"; request_id: string; docs: IncomingDoc[] };
type PingMsg = { type: "ping" };
type ClientMsg = HelloMsg | PullMsg | PushMsg | PingMsg | { type: string };

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
		const headSeq = await getHeadSeq(this.ctx.storage, claims.vaultId);
		this.ctx.peer.send({
			type: "ready",
			vault_id: claims.vaultId,
			head_seq: headSeq,
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
			case "pull":
				await this.handlePull(msg as PullMsg);
				return this;
			case "push":
				await this.handlePush(msg as PushMsg);
				return this;
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

	private async handlePull(msg: PullMsg): Promise<void> {
		const since = Number(msg.since ?? 0);
		const limit = Math.min(MAX_PULL_LIMIT, Number(msg.limit ?? MAX_PULL_LIMIT));
		const docs = await getSince(this.ctx.storage, this.vaultId, since, limit);
		const head = await getHeadSeq(this.ctx.storage, this.vaultId);
		const nextSince = docs.length > 0 ? docs[docs.length - 1].seq : since;
		const done = docs.length < limit || nextSince >= head;
		this.ctx.peer.send({
			type: "pull_result",
			request_id: msg.request_id,
			docs,
			next_since: nextSince,
			done,
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
		const acceptedById = new Map(
			results
				.filter(
					(r): r is { id: string; status: "accepted"; seq: number } =>
						r.status === "accepted",
				)
				.map((r) => [r.id, r.seq]),
		);
		if (acceptedById.size === 0) return;
		const broadcastDocs: DocRecord[] = incoming
			.filter((d) => acceptedById.has(d.id))
			.map((d) => ({
				id: d.id,
				seq: acceptedById.get(d.id) as number,
				updated: d.updated,
				deletedAt: d.deletedAt,
				data: d.data,
			}));
		const head = await getHeadSeq(this.ctx.storage, this.vaultId);
		this.ctx.hub.broadcast(
			this.vaultId,
			{ type: "changes", docs: broadcastDocs, head_seq: head },
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
		try {
			this.handler = await this.handler.handle(msg);
		} catch (err) {
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
