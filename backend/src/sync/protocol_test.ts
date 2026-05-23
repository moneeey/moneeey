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

const cred = () => ({
	credentialId: "c1",
	publicKey: "AA",
	counter: 0,
	createdAt: new Date().toISOString(),
});

const buildSessionToken = async (
	email: string,
	userId: string,
	vaultId: string,
) => await sessionJwt.generate(email, { vaultId, userId }, "5min");

const setupVault = async () => {
	const t = makeTempStorage();
	const user = await createUser(t.storage, "alice@example.com", cred());
	const vault = await createVaultForUser(t.storage, user.id);
	const hub = new VaultHub();
	return { t, user, vault, hub };
};

Deno.test(async function helloWithValidTokenSendsReady() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.email, user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		const last = peer.last();
		assert.assertEquals(last?.type, "ready");
		assert.assertEquals(last?.vault_id, vault.id);
		assert.assertEquals(last?.head_seq, 0);
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
		const stranger = await createUser(t.storage, "bob@example.com", cred());
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(
			stranger.email,
			stranger.id,
			vault.id,
		);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		assert.assertEquals(peer.closed?.code, CLOSE_FORBIDDEN);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pullBeforeHelloRespondsError() {
	const { t, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		await protocol.handleMessage(
			JSON.stringify({ type: "pull", request_id: "r1", since: 0 }),
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
		const token = await buildSessionToken(user.email, user.id, vault.id);
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
						updated: "2026-05-23T00:00:00Z",
						deletedAt: null,
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
		assert.assertEquals(changes?.head_seq, 1);

		const senderGotNoChanges = peerA.sent.find((m) => m.type === "changes");
		assert.assertEquals(senderGotNoChanges, undefined);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pullReturnsDocsAboveCursor() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.email, user.id, vault.id);
		await protocol.handleMessage(JSON.stringify({ type: "hello", token }));
		await protocol.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p1",
				docs: [
					{
						id: "a",
						updated: "2026-01-01T00:00:00Z",
						deletedAt: null,
						data: "x",
					},
					{
						id: "b",
						updated: "2026-01-01T00:00:00Z",
						deletedAt: null,
						data: "y",
					},
				],
			}),
		);
		peer.sent.length = 0;
		await protocol.handleMessage(
			JSON.stringify({ type: "pull", request_id: "r1", since: 1 }),
		);
		const last = peer.last();
		assert.assertEquals(last?.type, "pull_result");
		const docs = last?.docs as Array<{ id: string; seq: number }>;
		assert.assertEquals(docs.length, 1);
		assert.assertEquals(docs[0].id, "b");
		assert.assertEquals(docs[0].seq, 2);
		assert.assertEquals(last?.done, true);
		assert.assertEquals(last?.next_since, 2);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function pingRespondsPongAfterHello() {
	const { t, user, vault, hub } = await setupVault();
	try {
		const peer = new FakePeer();
		const protocol = new VaultProtocol(t.storage, hub, peer);
		const token = await buildSessionToken(user.email, user.id, vault.id);
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
		const token = await buildSessionToken(user.email, user.id, vault.id);
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
		const token = await buildSessionToken(user.email, user.id, vault.id);
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
		const token = await buildSessionToken(user.email, user.id, vault.id);
		await protoA.handleMessage(JSON.stringify({ type: "hello", token }));
		await protoB.handleMessage(JSON.stringify({ type: "hello", token }));
		await protoA.handleMessage(
			JSON.stringify({
				type: "push",
				request_id: "p1",
				docs: [
					{
						id: "x",
						updated: "2026-02-01T00:00:00Z",
						deletedAt: null,
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
						updated: "2026-01-01T00:00:00Z",
						deletedAt: null,
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
