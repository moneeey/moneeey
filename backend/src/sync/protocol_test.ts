import { makeTempStorage } from "../data/test_storage.ts";
import { createUser } from "../data/users.ts";
import { createVaultForUser } from "../data/vaults.ts";
import { sessionJwt } from "../jwt.ts";
import { assert } from "../test.ts";
import { type PeerSink, VaultHub } from "./hub.ts";
import {
	CLOSE_FORBIDDEN,
	CLOSE_UNAUTHORIZED,
	VaultProtocol,
} from "./protocol.ts";

type SentMsg = Record<string, unknown>;

class FakePeer implements PeerSink {
	sent: SentMsg[] = [];
	closed: { code?: number; reason?: string } | null = null;
	send(message: object) {
		this.sent.push(message as SentMsg);
	}
	close(code?: number, reason?: string) {
		this.closed = { code, reason };
	}
	last(): SentMsg | undefined {
		return this.sent[this.sent.length - 1];
	}
}

const buildSessionToken = async (userId: string, vaultId: string) =>
	await sessionJwt.generate(userId, { vaultId, userId }, "5min");

const setupVault = async () => {
	const t = makeTempStorage();
	const user = await createUser(t.storage, "Alice");
	const vault = await createVaultForUser(t.storage, user.id, "Alice's vault");
	const hub = new VaultHub();
	return { t, user, vault, hub };
};

Deno.test(async function helloWithValidTokenSendsReady() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		const last = peer.last();
		assert.assertEquals(last?.type, "ready");
		assert.assertEquals(last?.vault_id, vault.id);
		assert.assertEquals(hub.peerCount(vault.id), 1);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function helloWithInvalidTokenCloses4401() {
	const { t, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		await protocol.handleMessage(
			JSON.stringify({ type: "hello", token: "garbage" }),
		);
		assert.assertEquals(peer.closed?.code, CLOSE_UNAUTHORIZED);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function helloWithNonMemberCloses4403() {
	const { t, vault, hub } = await setupVault();
	try {
		const stranger = await createUser(t.storage, "Bob");
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(stranger.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		assert.assertEquals(peer.closed?.code, CLOSE_FORBIDDEN);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function manifestBeforeHelloRespondsError() {
	const { t, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		await protocol.handleMessage(
			JSON.stringify({ type: "manifest", request_id: "r1", entries: [] }),
		);
		const last = peer.last();
		assert.assertEquals(last?.type, "error");
		assert.assertEquals(last?.code, "not_ready");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pushAcceptedBroadcastsChangesToOtherPeers() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peerA = new FakePeer();
		const peerB = new FakePeer();
		const protoA = new VaultProtocol(t.storage, hub, peerA);
		const protoB = new VaultProtocol(t.storage, hub, peerB);
		const token = await buildSessionToken(user.id, vault.id);
		await protoA.handleMessage(JSON.stringify({ type: "hello", token }));
		await protoB.handleMessage(JSON.stringify({ type: "hello", token }));
		peerA.sent.length = 0;
		peerB.sent.length = 0;

		await protoA.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p1",
				docs: [
					{
						id: "ACCOUNT-1",
						updated_at: "2026-05-23T00:00:00.000Z",
						deleted_at: null,
						data: "cipher",
					},
				],
			}),
		);

		const pushResult = peerA.sent.find((m) => m.type === "push_result");
		assert.assertExists(pushResult);
		assert.assertEquals(
			(pushResult?.results as Array<{ status: string }>)[0].status,
			"accepted",
		);

		const changes = peerB.sent.find((m) => m.type === "changes");
		assert.assertExists(changes);
		assert.assertEquals(
			(changes?.docs as Array<{ id: string }>)[0].id,
			"ACCOUNT-1",
		);

		const senderGotNoChanges = peerA.sent.find((m) => m.type === "changes");
		assert.assertEquals(senderGotNoChanges, undefined);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function manifestComputesPullAndPushIds() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		await protocol.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p1",
				docs: [
					{
						id: "server-only",
						updated_at: "2026-01-01T00:00:00.000Z",
						deleted_at: null,
						data: "s1",
					},
					{
						id: "server-newer",
						updated_at: "2026-02-01T00:00:00.000Z",
						deleted_at: null,
						data: "s2",
					},
					{
						id: "in-sync",
						updated_at: "2026-01-01T00:00:00.000Z",
						deleted_at: null,
						data: "s3",
					},
				],
			}),
		);
		peer.sent.length = 0;
		await protocol.handleMessage(
			JSON.stringify({
				type: "manifest",
				request_id: "m1",
				entries: [
					{ id: "in-sync", updated_at: "2026-01-01T00:00:00.000Z" },
					{ id: "client-only", updated_at: "2026-01-01T00:00:00.000Z" },
					{ id: "server-newer", updated_at: "2026-01-15T00:00:00.000Z" },
				],
			}),
		);
		const last = peer.last();
		assert.assertEquals(last?.type, "reconcile_result");
		assert.assertEquals((last?.pull_ids as string[]).sort(), [
			"server-newer",
			"server-only",
		]);
		assert.assertEquals(last?.push_ids as string[], ["client-only"]);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function fetchReturnsRequestedDocs() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		await protocol.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p1",
				docs: [
					{
						id: "a",
						updated_at: "2026-01-01T00:00:00.000Z",
						deleted_at: null,
						data: "x",
					},
					{
						id: "b",
						updated_at: "2026-01-01T00:00:00.000Z",
						deleted_at: null,
						data: "y",
					},
				],
			}),
		);
		peer.sent.length = 0;
		await protocol.handleMessage(
			JSON.stringify({ type: "fetch", request_id: "f1", ids: ["b"] }),
		);
		const last = peer.last();
		assert.assertEquals(last?.type, "fetch_result");
		const docs = last?.docs as Array<{ id: string; data: string }>;
		assert.assertEquals(docs.length, 1);
		assert.assertEquals(docs[0].id, "b");
		assert.assertEquals(docs[0].data, "y");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pingRespondsPongAfterHello() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		await protocol.handleMessage(JSON.stringify({ type: "ping" }));
		assert.assertEquals(peer.last()?.type, "pong");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pingBeforeHelloRespondsError() {
	const { t, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		await protocol.handleMessage(JSON.stringify({ type: "ping" }));
		assert.assertEquals(peer.last()?.type, "error");
		assert.assertEquals(peer.last()?.code, "not_ready");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function helloTwiceRespondsError() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		peer.sent.length = 0;
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		assert.assertEquals(peer.last()?.type, "error");
		assert.assertEquals(peer.last()?.code, "bad_request");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function closeDeregistersPeer() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		assert.assertEquals(hub.peerCount(vault.id), 1);
		protocol.handleClose();
		assert.assertEquals(hub.peerCount(vault.id), 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function staleIncomingNotBroadcast() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peerA = new FakePeer();
		const peerB = new FakePeer();
		const protoA = new VaultProtocol(t.storage, hub, peerA);
		const protoB = new VaultProtocol(t.storage, hub, peerB);
		const token = await buildSessionToken(user.id, vault.id);
		await protoA.handleMessage(JSON.stringify({ type: "hello", token }));
		await protoB.handleMessage(JSON.stringify({ type: "hello", token }));
		await protoA.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p1",
				docs: [
					{
						id: "x",
						updated_at: "2026-02-01T00:00:00.000Z",
						deleted_at: null,
						data: "newer",
					},
				],
			}),
		);
		peerB.sent.length = 0;
		await protoA.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p2",
				docs: [
					{
						id: "x",
						updated_at: "2026-01-01T00:00:00.000Z",
						deleted_at: null,
						data: "older",
					},
				],
			}),
		);
		const changes = peerB.sent.find((m) => m.type === "changes");
		assert.assertEquals(changes, undefined);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pushBeforeHelloRespondsError() {
	const { t, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		await protocol.handleMessage(
			JSON.stringify({ type: "push", request_id: "p1", docs: [] }),
		);
		assert.assertEquals(peer.last()?.type, "error");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function malformedJsonReturnsError() {
	const { t, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		await protocol.handleMessage("not json");
		assert.assertEquals(peer.last()?.type, "error");
		assert.assertEquals(peer.last()?.code, "bad_request");
	} finally {
		t.cleanup();
	}
});
