import { assert } from "../test.ts";
import {
	type DocRecord,
	type IncomingDoc,
	bulkUpsert,
	getDocs,
	getManifest,
} from "./documents.ts";
import { makeTempStorage } from "./test_storage.ts";

const VAULT = "aaaaaaaaaaaaaaaaaaaaa";
const VAULT_B = "bbbbbbbbbbbbbbbbbbbbb";

const doc = (
	id: string,
	updated_at: string,
	data = "cipher",
	deleted_at: string | null = null,
): IncomingDoc => ({ id, updated_at, deleted_at, data });

Deno.test(async function bulkUpsertAcceptsAllNew() {
	const t = makeTempStorage();
	try {
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z"),
			doc("b", "2026-01-01T00:00:00.000Z"),
			doc("c", "2026-01-01T00:00:00.000Z"),
		]);
		assert.assertEquals(
			result.map((r) => r.status),
			["accepted", "accepted", "accepted"],
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function bulkUpsertHandlesEmptyList() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await bulkUpsert(t.storage, VAULT, []), []);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function lwwRejectsStaleIncoming() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-02T00:00:00.000Z", "newer"),
		]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z", "older"),
		]);
		assert.assertEquals(result, [
			{
				id: "a",
				status: "stale",
				current_updated_at: "2026-01-02T00:00:00.000Z",
			},
		]);
		const after = await getDocs(t.storage, VAULT, ["a"]);
		assert.assertEquals(after[0].data, "newer");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function lwwAcceptsNewerIncoming() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z", "older"),
		]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-02T00:00:00.000Z", "newer"),
		]);
		assert.assertEquals(result, [{ id: "a", status: "accepted" }]);
		const after = await getDocs(t.storage, VAULT, ["a"]);
		assert.assertEquals(after.length, 1);
		assert.assertEquals(after[0].data, "newer");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function lwwTieGoesToIncoming() {
	const t = makeTempStorage();
	try {
		const sameTs = "2026-01-01T00:00:00.000Z";
		await bulkUpsert(t.storage, VAULT, [doc("a", sameTs, "first")]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", sameTs, "second"),
		]);
		assert.assertEquals(result, [{ id: "a", status: "accepted" }]);
		const after = await getDocs(t.storage, VAULT, ["a"]);
		assert.assertEquals(after[0].data, "second");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function manifestReturnsIdAndUpdatedAt() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z"),
			doc("b", "2026-01-02T00:00:00.000Z"),
		]);
		const manifest = await getManifest(t.storage, VAULT);
		assert.assertEquals(manifest.length, 2);
		const byId = new Map(manifest.map((e) => [e.id, e.updated_at]));
		assert.assertEquals(byId.get("a"), "2026-01-01T00:00:00.000Z");
		assert.assertEquals(byId.get("b"), "2026-01-02T00:00:00.000Z");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getDocsReturnsRequestedIds() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z", "data-a"),
			doc("b", "2026-01-01T00:00:00.000Z", "data-b"),
			doc("c", "2026-01-01T00:00:00.000Z", "data-c"),
		]);
		const fetched = await getDocs(t.storage, VAULT, ["a", "c"]);
		const ids = fetched.map((d: DocRecord) => d.id).sort();
		assert.assertEquals(ids, ["a", "c"]);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getDocsHandlesEmpty() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await getDocs(t.storage, VAULT, []), []);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function tombstonesCarryDeletedAtTimestamp() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z", "cipher"),
		]);
		const deletedAt = "2026-01-02T00:00:00.000Z";
		await bulkUpsert(t.storage, VAULT, [doc("a", deletedAt, "", deletedAt)]);
		const all = await getDocs(t.storage, VAULT, ["a"]);
		assert.assertEquals(all.length, 1);
		assert.assertEquals(all[0].deleted_at, deletedAt);
		assert.assertEquals(all[0].data, "");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function nonTombstoneRowsHaveNullDeletedAt() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [doc("a", "2026-01-01T00:00:00.000Z")]);
		const all = await getDocs(t.storage, VAULT, ["a"]);
		assert.assertEquals(all[0].deleted_at, null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function vaultsAreIsolatedByFile() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z", "in-a"),
		]);
		await bulkUpsert(t.storage, VAULT_B, [
			doc("a", "2026-01-01T00:00:00.000Z", "in-b"),
		]);
		const a = await getDocs(t.storage, VAULT, ["a"]);
		const b = await getDocs(t.storage, VAULT_B, ["a"]);
		assert.assertEquals(
			a.map((d: DocRecord) => d.data),
			["in-a"],
		);
		assert.assertEquals(
			b.map((d: DocRecord) => d.data),
			["in-b"],
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function manifestStartsEmpty() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await getManifest(t.storage, VAULT), []);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function staleAndAcceptedMixInOneBatch() {
	const t = makeTempStorage();
	try {
		await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-02T00:00:00.000Z", "a-newer"),
			doc("b", "2026-01-01T00:00:00.000Z", "b"),
		]);
		const result = await bulkUpsert(t.storage, VAULT, [
			doc("a", "2026-01-01T00:00:00.000Z", "a-older"),
			doc("c", "2026-01-01T00:00:00.000Z", "c-new"),
		]);
		assert.assertEquals(result.length, 2);
		assert.assertEquals(result[0], {
			id: "a",
			status: "stale",
			current_updated_at: "2026-01-02T00:00:00.000Z",
		});
		assert.assertEquals(result[1], { id: "c", status: "accepted" });
	} finally {
		t.cleanup();
	}
});
