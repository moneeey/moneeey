import { assert } from "../test.ts";
import {
	type IncomingDoc,
	bulkUpsert,
	getHeadSeq,
	getSince,
} from "./documents.ts";
import { makeTempStorage } from "./test_storage.ts";

const VAULT = "aaaaaaaaaaaaaaaaaaaaa";
const VAULT_B = "bbbbbbbbbbbbbbbbbbbbb";

const doc = (
	id: string,
	updated: string,
	data = "cipher",
	deletedAt: string | null = null,
): IncomingDoc => ({ id, updated, deletedAt, data });

Deno.test(async function bulkUpsertAssignsMonotonicSeq() {
	const t = makeTempStorage();
	try {
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z"),
			doc("b", "2026-01-01T00:00:00Z"),
			doc("c", "2026-01-01T00:00:00Z"),
		]);
		assert.assertEquals(
			result.map((r) => (r.status === "accepted" ? r.seq : -1)),
			[1, 2, 3],
		);
		assert.assertEquals(await getHeadSeq(t.storage, VAULT), 3);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function bulkUpsertHandlesEmptyList() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await bulkUpsert(t.storage, VAULT, []), []);
		assert.assertEquals(await getHeadSeq(t.storage, VAULT), 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function lwwRejectsStaleIncoming() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-02T00:00:00Z", "newer"),
		]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z", "older"),
		]);
		assert.assertEquals(result, [{ id: "a", status: "stale", currentSeq: 1 }]);
		const after = await getSince(t.storage, VAULT, 0, 100);
		assert.assertEquals(after[0].data, "newer");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function lwwAcceptsNewerIncoming() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z", "older"),
		]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-02T00:00:00Z", "newer"),
		]);
		assert.assertEquals(result, [{ id: "a", status: "accepted", seq: 2 }]);
		const after = await getSince(t.storage, VAULT, 0, 100);
		assert.assertEquals(after.length, 1);
		assert.assertEquals(after[0].data, "newer");
		assert.assertEquals(after[0].seq, 2);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function lwwTieGoesToIncoming() {
	const t = makeTempStorage();
	try {
		const sameTs = "2026-01-01T00:00:00Z";
		await bulkUpsert(t.storage, VAULT, [doc("a", sameTs, "first")]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", sameTs, "second"),
		]);
		assert.assertEquals(result, [{ id: "a", status: "accepted", seq: 2 }]);
		const after = await getSince(t.storage, VAULT, 0, 100);
		assert.assertEquals(after[0].data, "second");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getSinceReturnsOnlyRowsAboveCursor() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z"),
			doc("b", "2026-01-01T00:00:00Z"),
			doc("c", "2026-01-01T00:00:00Z"),
		]);
		const tail = await getSince(t.storage, VAULT, 1, 100);
		assert.assertEquals(
			tail.map((d) => d.id),
			["b", "c"],
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getSinceRespectsLimit() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z"),
			doc("b", "2026-01-01T00:00:00Z"),
			doc("c", "2026-01-01T00:00:00Z"),
		]);
		const first = await getSince(t.storage, VAULT, 0, 2);
		assert.assertEquals(first.length, 2);
		assert.assertEquals(
			first.map((d) => d.id),
			["a", "b"],
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function tombstonesCarryDeletedAtTimestamp() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z", "cipher"),
		]);
		const deletedAt = "2026-01-02T00:00:00Z";
		await bulkUpsert(t.storage, VAULT, [
			doc("a", deletedAt, "", deletedAt),
		]);
		const all = await getSince(t.storage, VAULT, 0, 100);
		assert.assertEquals(all.length, 1);
		assert.assertEquals(all[0].deletedAt, deletedAt);
		assert.assertEquals(all[0].data, "");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function nonTombstoneRowsHaveNullDeletedAt() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [doc("a", "2026-01-01T00:00:00Z")]);
		const all = await getSince(t.storage, VAULT, 0, 100);
		assert.assertEquals(all[0].deletedAt, null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function vaultsAreIsolatedByFile() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [doc("a", "2026-01-01T00:00:00Z", "in-a")]);
		await bulkUpsert(t.storage, VAULT_B, [
			doc("a", "2026-01-01T00:00:00Z", "in-b"),
		]);
		const a = await getSince(t.storage, VAULT, 0, 100);
		const b = await getSince(t.storage, VAULT_B, 0, 100);
		assert.assertEquals(a.map((d) => d.data), ["in-a"]);
		assert.assertEquals(b.map((d) => d.data), ["in-b"]);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getHeadSeqStartsAtZero() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await getHeadSeq(t.storage, VAULT), 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function staleAndAcceptedMixInOneBatch() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-02T00:00:00Z", "a-newer"),
			doc("b", "2026-01-01T00:00:00Z", "b"),
		]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00Z", "a-older"),
			doc("c", "2026-01-01T00:00:00Z", "c-new"),
		]);
		assert.assertEquals(result.length, 2);
		assert.assertEquals(result[0], { id: "a", status: "stale", currentSeq: 1 });
		assert.assertEquals(result[1], { id: "c", status: "accepted", seq: 3 });
	} finally {
		t.cleanup();
	}
});
