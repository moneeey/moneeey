import { bulkUpsert, getDocs, getManifest } from "../data/documents.ts";
import { createInvite, findInvite, redeemInvite } from "../data/invites.ts";
import { makeTempStorage } from "../data/test_storage.ts";
import { createUser } from "../data/users.ts";
import {
	MAX_USERS_PER_VAULT,
	VaultFullError,
	addMember,
	createVaultForUser,
	deleteVault,
	userHasAccess,
} from "../data/vaults.ts";
import { assert } from "../test.ts";

Deno.test(async function documentUpsertUpdateAndStaleRejection() {
	const t = makeTempStorage();
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
		assert.assertEquals(
			(await getDocs(t.storage, vault.id, ["d1"]))[0].data,
			"x",
		);

		const updated = await bulkUpsert(t.storage, vault.id, [
			{
				id: "d1",
				updated_at: "2026-06-01",
				deleted_at: "2999-06-01",
				data: "y",
			},
		]);
		assert.assertEquals(updated[0].status, "accepted");
		const doc = (await getDocs(t.storage, vault.id, ["d1"]))[0];
		assert.assertEquals(doc.data, "y");
		assert.assertEquals(doc.deleted_at, "2999-06-01");

		const stale = await bulkUpsert(t.storage, vault.id, [
			{ id: "d1", updated_at: "2025-01-01", deleted_at: null, data: "old" },
		]);
		assert.assertEquals(stale[0].status, "stale");
		assert.assertEquals(
			(await getDocs(t.storage, vault.id, ["d1"]))[0].data,
			"y",
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function vaultsAreIsolated() {
	const t = makeTempStorage();
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

		assert.assertEquals(
			(await getDocs(t.storage, va.id, ["same"]))[0].data,
			"a",
		);
		assert.assertEquals(
			(await getDocs(t.storage, vb.id, ["same"]))[0].data,
			"b",
		);
		assert.assertEquals((await getManifest(t.storage, va.id)).length, 1);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function inviteRoundTripAndVaultDeletion() {
	const t = makeTempStorage();
	try {
		const owner = await createUser(t.storage, "Owner");
		const guest = await createUser(t.storage, "Guest");
		const vault = await createVaultForUser(t.storage, owner.id, "Vault");

		const token = await createInvite(t.storage, owner.id, vault.id);
		assert.assertEquals(
			(await findInvite(t.storage, token))?.vaultId,
			vault.id,
		);
		assert.assertEquals(
			await redeemInvite(t.storage, token, guest.id),
			vault.id,
		);
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

Deno.test(async function membershipCapIsEnforced() {
	const t = makeTempStorage();
	try {
		const owner = await createUser(t.storage, "Owner");
		const vault = await createVaultForUser(t.storage, owner.id, "Vault");
		for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
			const member = await createUser(t.storage, `member-${i}`);
			await addMember(t.storage, vault.id, member.id);
		}
		const extra = await createUser(t.storage, "Extra");
		await assert.assertRejects(
			() => addMember(t.storage, vault.id, extra.id),
			VaultFullError,
		);
	} finally {
		t.cleanup();
	}
});
