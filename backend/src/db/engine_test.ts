import { bulkUpsert, getDocs, getManifest } from "../data/documents.ts";
import { createInvite, findInvite, redeemInvite } from "../data/invites.ts";
import { makeTempStorage } from "../data/test_storage.ts";
import { createUser } from "../data/users.ts";
import {
	createVaultForUser,
	deleteVault,
	userHasAccess,
} from "../data/vaults.ts";
import { assert } from "../test.ts";
import type { DbEngineKind } from "./engine.ts";

const KINDS: DbEngineKind[] = ["sqlite-per-vault", "sqlite-single"];

for (const kind of KINDS) {
	Deno.test(`[${kind}] document round-trip`, async () => {
		const t = makeTempStorage(kind);
		try {
			const alice = await createUser(t.storage, "Alice");
			const vault = await createVaultForUser(t.storage, alice.id, "Vault");

			const accepted = await bulkUpsert(t.storage, vault.id, [
				{ id: "d1", updated_at: "2026-01-01", deleted_at: null, data: "x" },
			]);
			assert.assertEquals(accepted[0].status, "accepted");

			const manifest = await getManifest(t.storage, vault.id);
			assert.assertEquals(manifest.length, 1);
			assert.assertEquals(manifest[0].id, "d1");

			const docs = await getDocs(t.storage, vault.id, ["d1"]);
			assert.assertEquals(docs[0].data, "x");

			const stale = await bulkUpsert(t.storage, vault.id, [
				{ id: "d1", updated_at: "2025-01-01", deleted_at: null, data: "old" },
			]);
			assert.assertEquals(stale[0].status, "stale");
		} finally {
			t.cleanup();
		}
	});

	Deno.test(`[${kind}] vaults are isolated`, async () => {
		const t = makeTempStorage(kind);
		try {
			const alice = await createUser(t.storage, "Alice");
			const bob = await createUser(t.storage, "Bob");
			const va = await createVaultForUser(t.storage, alice.id, "A");
			const vb = await createVaultForUser(t.storage, bob.id, "B");

			await bulkUpsert(t.storage, va.id, [
				{ id: "same", updated_at: "2026-01-01", deleted_at: null, data: "a" },
			]);
			await bulkUpsert(t.storage, vb.id, [
				{ id: "same", updated_at: "2026-02-02", deleted_at: null, data: "b" },
			]);

			const aDocs = await getDocs(t.storage, va.id, ["same"]);
			const bDocs = await getDocs(t.storage, vb.id, ["same"]);
			assert.assertEquals(aDocs[0].data, "a");
			assert.assertEquals(bDocs[0].data, "b");
			assert.assertEquals((await getManifest(t.storage, va.id)).length, 1);
		} finally {
			t.cleanup();
		}
	});

	Deno.test(`[${kind}] invite round-trip and vault deletion`, async () => {
		const t = makeTempStorage(kind);
		try {
			const owner = await createUser(t.storage, "Owner");
			const guest = await createUser(t.storage, "Guest");
			const vault = await createVaultForUser(t.storage, owner.id, "Vault");

			const token = await createInvite(t.storage, owner.id, vault.id);
			const found = await findInvite(t.storage, token);
			assert.assertEquals(found?.vaultId, vault.id);
			const redeemedVault = await redeemInvite(t.storage, token, guest.id);
			assert.assertEquals(redeemedVault, vault.id);
			assert.assertEquals(
				await userHasAccess(t.storage, guest.id, vault.id),
				true,
			);

			await bulkUpsert(t.storage, vault.id, [
				{ id: "d1", updated_at: "2026-01-01", deleted_at: null, data: "x" },
			]);
			await deleteVault(t.storage, vault.id);
			assert.assertEquals((await getManifest(t.storage, vault.id)).length, 0);
			assert.assertEquals(
				await userHasAccess(t.storage, owner.id, vault.id),
				false,
			);
		} finally {
			t.cleanup();
		}
	});
}
