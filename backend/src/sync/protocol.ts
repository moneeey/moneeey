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

export class VaultProtocol {
	private state: "open" | "ready" | "closed" = "open";
	private vaultId: string | null = null;
	private deregister: (() => void) | null = null;

	constructor(
		private storage: Storage,
		private hub: VaultHub,
		private peer: PeerSink,
	) {}

	get currentVaultId(): string | null {
		return this.vaultId;
	}

	async handleMessage(raw: string): Promise<void> {
		if (this.state === "closed") return;
		let msg: ClientMsg;
		try {
			msg = JSON.parse(raw) as ClientMsg;
		} catch {
			this.error(undefined, "bad_request", "invalid JSON");
			return;
		}
		try {
			switch (msg.type) {
				case "hello":
					await this.handleHello(msg as HelloMsg);
					return;
				case "ping":
					this.peer.send({ type: "pong" });
					return;
				case "pull":
					await this.handlePull(msg as PullMsg);
					return;
				case "push":
					await this.handlePush(msg as PushMsg);
					return;
				default:
					this.error(undefined, "bad_request", `unknown type ${msg.type}`);
			}
		} catch (err) {
			logger.error("handler error", { err, type: msg.type });
			const requestId = (msg as { request_id?: string }).request_id;
			this.error(requestId, "server_error", (err as Error).message);
		}
	}

	handleClose(): void {
		this.state = "closed";
		if (this.deregister) {
			this.deregister();
			this.deregister = null;
		}
	}

	private async handleHello(msg: HelloMsg): Promise<void> {
		if (this.state !== "open") {
			this.error(undefined, "bad_request", "hello already received");
			return;
		}
		if (typeof msg.token !== "string" || msg.token.length === 0) {
			this.peer.close(CLOSE_UNAUTHORIZED, "missing token");
			this.state = "closed";
			return;
		}
		const claims = await validateSessionToken(msg.token);
		if (!claims) {
			this.peer.close(CLOSE_UNAUTHORIZED, "invalid token");
			this.state = "closed";
			return;
		}
		if (!claims.vaultId) {
			this.peer.close(CLOSE_UNAUTHORIZED, "no vault in token");
			this.state = "closed";
			return;
		}
		const access = await userHasAccess(
			this.storage,
			claims.userId,
			claims.vaultId,
		);
		if (!access) {
			this.peer.close(CLOSE_FORBIDDEN, "not a member of vault");
			this.state = "closed";
			return;
		}
		this.vaultId = claims.vaultId;
		this.state = "ready";
		this.deregister = this.hub.registerPeer(claims.vaultId, this.peer);
		const headSeq = await getHeadSeq(this.storage, claims.vaultId);
		this.peer.send({
			type: "ready",
			vault_id: claims.vaultId,
			head_seq: headSeq,
		});
	}

	private async handlePull(msg: PullMsg): Promise<void> {
		if (this.state !== "ready" || !this.vaultId) {
			this.error(msg.request_id, "not_ready", "send hello first");
			return;
		}
		const since = Number(msg.since ?? 0);
		const limit = Math.min(MAX_PULL_LIMIT, Number(msg.limit ?? MAX_PULL_LIMIT));
		const docs = await getSince(this.storage, this.vaultId, since, limit);
		const head = await getHeadSeq(this.storage, this.vaultId);
		const nextSince = docs.length > 0 ? docs[docs.length - 1].seq : since;
		const done = docs.length < limit || nextSince >= head;
		this.peer.send({
			type: "pull_result",
			request_id: msg.request_id,
			docs,
			next_since: nextSince,
			done,
		});
	}

	private async handlePush(msg: PushMsg): Promise<void> {
		if (this.state !== "ready" || !this.vaultId) {
			this.error(msg.request_id, "not_ready", "send hello first");
			return;
		}
		const incoming = msg.docs;
		if (!Array.isArray(incoming)) {
			this.error(msg.request_id, "bad_request", "docs must be an array");
			return;
		}
		if (incoming.length > MAX_PUSH_DOCS) {
			this.error(msg.request_id, "too_many_docs", `max ${MAX_PUSH_DOCS}`);
			return;
		}
		for (const d of incoming) {
			if (typeof d?.id !== "string" || d.id.length === 0) {
				this.error(msg.request_id, "bad_request", "doc.id required");
				return;
			}
			if (typeof d.data !== "string" || d.data.length > MAX_DATA_BYTES) {
				this.error(msg.request_id, "bad_request", "doc.data too large");
				return;
			}
		}
		const results = await bulkUpsert(this.storage, this.vaultId, incoming);
		this.peer.send({
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
		const head = await getHeadSeq(this.storage, this.vaultId);
		this.hub.broadcast(
			this.vaultId,
			{ type: "changes", docs: broadcastDocs, head_seq: head },
			this.peer,
		);
	}

	private error(requestId: string | undefined, code: string, message: string) {
		this.peer.send({
			type: "error",
			request_id: requestId,
			code,
			message,
		});
	}
}
