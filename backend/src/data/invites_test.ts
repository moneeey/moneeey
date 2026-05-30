import type { Storage } from "../db/engine.ts";
import { assert } from "../test.ts";
import {
	INVITE_QUOTA_PER_OWNER,
	createInvite,
	findInvite,
	redeemInvite,
} from "./invites.ts";
import { makeTempStorage } from "./test_storage.ts";
import { createUser } from "./users.ts";
import {
	MAX_USERS_PER_VAULT,
	VaultFullError,
	addMember,
	createVaultForUser,
} from "./vaults.ts";

const seedUser = async (storage: Storage, displayName: string) => {
	const u = await createUser(storage, displayName);
	return u.id;
};

const newVault = async (storage: Storage, userId: string) =>
	createVaultForUser(storage, userId, "Test vault");

Deno.test(async function createInviteAndFindRoundTrip() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		assert.assertEquals(token.startsWith(`${vault.id}.`), true);
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
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
		assert.assertEquals(
			await findInvite(t.storage, `${vault.id}.nonexistent`),
			null,
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function findInviteReturnsNullForBadTokenFormat() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await findInvite(t.storage, "noseparator"), null);
		assert.assertEquals(await findInvite(t.storage, ".onlysuffix"), null);
		assert.assertEquals(await findInvite(t.storage, "onlyprefix."), null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function redeemInviteAddsMembership() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "Owner");
		const guest = await seedUser(t.storage, "Guest");
		const vault = await newVault(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		const vaultId = await redeemInvite(t.storage, token, guest);
		assert.assertEquals(vaultId, vault.id);
		const accessible = await t.storage.withConn((conn) =>
			conn.get<{ role: string }>(
				"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				guest,
				vault.id,
			),
		);
		assert.assertEquals(accessible?.role, "member");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function redeemInviteCannotBeUsedTwice() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "Owner");
		const g1 = await seedUser(t.storage, "G1");
		const g2 = await seedUser(t.storage, "G2");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
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

Deno.test(async function redeemInviteRejectsWhenVaultIsFull() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
		for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
			const u = await seedUser(t.storage, `u${i}`);
			await addMember(t.storage, vault.id, u);
		}
		const guest = await seedUser(t.storage, "Guest");
		const token = await createInvite(t.storage, owner, vault.id);
		await assert.assertRejects(
			() => redeemInvite(t.storage, token, guest),
			VaultFullError,
		);
		const stillUnredeemed = await findInvite(t.storage, token);
		assert.assertExists(stillUnredeemed);
		assert.assertEquals(stillUnredeemed?.redeemedBy, null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function findInviteRejectsExpired() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
		const token = await createInvite(t.storage, owner, vault.id);
		const found1 = await findInvite(t.storage, token);
		assert.assertExists(found1);
		await t.storage.withConn((conn) =>
			conn.run(
				"UPDATE invites SET expires_at = ? WHERE vault_id = ?",
				new Date(Date.now() - 1000).toISOString(),
				vault.id,
			),
		);
		assert.assertEquals(await findInvite(t.storage, token), null);
	} finally {
		t.cleanup();
	}
});
