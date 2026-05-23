import type { Storage } from "../db/storage.ts";
import { assert } from "../test.ts";
import {
	INVITE_QUOTA_PER_OWNER,
	createInvite,
	findInvite,
	redeemInvite,
} from "./invites.ts";
import { makeTempStorage } from "./test_storage.ts";
import type { StoredCredential } from "./types.ts";
import { createUser } from "./users.ts";
import { createVaultForUser } from "./vaults.ts";

const cred = (id = "c"): StoredCredential => ({
	credentialId: id,
	publicKey: "AAAA",
	counter: 0,
	createdAt: new Date().toISOString(),
});

const seedUser = async (storage: Storage, email: string) => {
	const u = await createUser(storage, email, cred(`c-${email}`));
	return u.id;
};

Deno.test(async function createInviteAndFindRoundTrip() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		const found = await findInvite(t.storage, token);
		assert.assertExists(found);
		assert.assertEquals(found?.vaultId, vault.id);
		assert.assertEquals(found?.redeemedBy, null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function findInviteReturnsNullForUnknownToken() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await findInvite(t.storage, "nonexistent"), null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function redeemInviteAddsMembership() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const guest = await seedUser(t.storage, "guest@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		const vaultId = await redeemInvite(t.storage, token, guest);
		assert.assertEquals(vaultId, vault.id);
		const accessible = await t.storage.withMeta((db) =>
			db
				.prepare(
					"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				)
				.get<{ role: string }>(guest, vault.id),
		);
		assert.assertEquals(accessible?.role, "member");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function redeemInviteCannotBeUsedTwice() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const g1 = await seedUser(t.storage, "g1@x.io");
		const g2 = await seedUser(t.storage, "g2@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		await redeemInvite(t.storage, token, g1);
		await assert.assertRejects(
			() => redeemInvite(t.storage, token, g2),
			Error,
			"invite_not_found",
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function createInviteEnforcesQuota() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		for (let i = 0; i < INVITE_QUOTA_PER_OWNER; i++) {
			await createInvite(t.storage, owner, vault.id);
		}
		await assert.assertRejects(
			() => createInvite(t.storage, owner, vault.id),
			Error,
			"invite_quota_exceeded",
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function findInviteRejectsExpired() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		const found1 = await findInvite(t.storage, token);
		assert.assertExists(found1);
		await t.storage.withMeta((db) => {
			db.prepare("UPDATE invites SET expires_at = ?").run(
				new Date(Date.now() - 1000).toISOString(),
			);
		});
		assert.assertEquals(await findInvite(t.storage, token), null);
	} finally {
		t.cleanup();
	}
});
