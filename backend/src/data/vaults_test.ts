import type { Storage } from "../db/storage.ts";
import { fs } from "../deps.ts";
import { assert } from "../test.ts";
import { makeTempStorage } from "./test_storage.ts";
import type { StoredCredential } from "./types.ts";
import { createUser } from "./users.ts";
import {
	CannotRemoveOwnerError,
	MAX_USERS_PER_VAULT,
	NotOwnerError,
	TargetNotMemberError,
	VaultFullError,
	addMember,
	countMembers,
	createVaultForUser,
	deleteVault,
	getMembership,
	getVaultsByUser,
	listVaultMembers,
	removeMember,
	transferOwnership,
	userHasAccess,
} from "./vaults.ts";

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

Deno.test(async function createVaultForUserCreatesRowMembershipAndFile() {
	const t = makeTempStorage();
	try {
		const userId = await seedUser(t.storage, "u1@x.io");
		const v = await createVaultForUser(t.storage, userId);
		assert.assertEquals(typeof v.id, "string");
		assert.assertEquals(v.id.length, 21);
		assert.assertEquals(fs.existsSync(t.storage.vaultPath(v.id)), true);
		const membership = await getMembership(t.storage, userId, v.id);
		assert.assertEquals(membership?.role, "owner");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getVaultsByUserReturnsAllOwnedAndShared() {
	const t = makeTempStorage();
	try {
		const userA = await seedUser(t.storage, "a@x.io");
		const userB = await seedUser(t.storage, "b@x.io");
		const a = await createVaultForUser(t.storage, userA);
		const b = await createVaultForUser(t.storage, userB);
		await addMember(t.storage, b.id, userA, "member");
		const vaults = await getVaultsByUser(t.storage, userA);
		assert.assertEquals(vaults.map((v) => v.id).sort(), [a.id, b.id].sort());
	} finally {
		t.cleanup();
	}
});

Deno.test(async function userHasAccessReflectsMembership() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const stranger = await seedUser(t.storage, "stranger@x.io");
		const v = await createVaultForUser(t.storage, owner);
		assert.assertEquals(await userHasAccess(t.storage, owner, v.id), true);
		assert.assertEquals(await userHasAccess(t.storage, stranger, v.id), false);
		await addMember(t.storage, v.id, stranger);
		assert.assertEquals(await userHasAccess(t.storage, stranger, v.id), true);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function addMemberIsIdempotent() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const guest = await seedUser(t.storage, "guest@x.io");
		const v = await createVaultForUser(t.storage, owner);
		await addMember(t.storage, v.id, guest);
		await addMember(t.storage, v.id, guest);
		const vaults = await getVaultsByUser(t.storage, guest);
		assert.assertEquals(vaults.length, 1);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function deleteVaultRemovesRowsAndFile() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const v = await createVaultForUser(t.storage, owner);
		const path = t.storage.vaultPath(v.id);
		assert.assertEquals(fs.existsSync(path), true);
		await deleteVault(t.storage, v.id);
		assert.assertEquals(fs.existsSync(path), false);
		assert.assertEquals(await userHasAccess(t.storage, owner, v.id), false);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function addMemberRejectsBeyondCap() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
			const u = await seedUser(t.storage, `u${i}@x.io`);
			await addMember(t.storage, vault.id, u);
		}
		assert.assertEquals(
			await countMembers(t.storage, vault.id),
			MAX_USERS_PER_VAULT,
		);
		const extra = await seedUser(t.storage, "extra@x.io");
		await assert.assertRejects(
			() => addMember(t.storage, vault.id, extra),
			VaultFullError,
		);
		assert.assertEquals(
			await countMembers(t.storage, vault.id),
			MAX_USERS_PER_VAULT,
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function addMemberAtCapStillAllowsExistingMemberRetry() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
			const u = await seedUser(t.storage, `u${i}@x.io`);
			await addMember(t.storage, vault.id, u);
		}
		await addMember(t.storage, vault.id, owner);
		assert.assertEquals(
			await countMembers(t.storage, vault.id),
			MAX_USERS_PER_VAULT,
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function listVaultMembersReturnsOwnerFirstThenMembers() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const m1 = await seedUser(t.storage, "m1@x.io");
		const m2 = await seedUser(t.storage, "m2@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await addMember(t.storage, vault.id, m1);
		await addMember(t.storage, vault.id, m2);
		const members = await listVaultMembers(t.storage, vault.id);
		assert.assertEquals(members.length, 3);
		assert.assertEquals(members[0].role, "owner");
		assert.assertEquals(members[0].email, "owner@x.io");
		assert.assertEquals(
			members
				.slice(1)
				.map((m) => m.email)
				.sort(),
			["m1@x.io", "m2@x.io"],
		);
		for (const m of members.slice(1)) {
			assert.assertEquals(m.role, "member");
		}
	} finally {
		t.cleanup();
	}
});

Deno.test(async function removeMemberRemovesMemberRow() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const guest = await seedUser(t.storage, "guest@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await addMember(t.storage, vault.id, guest);
		assert.assertEquals(await userHasAccess(t.storage, guest, vault.id), true);
		await removeMember(t.storage, vault.id, guest);
		assert.assertEquals(await userHasAccess(t.storage, guest, vault.id), false);
		assert.assertEquals(await userHasAccess(t.storage, owner, vault.id), true);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function removeMemberRefusesToRemoveOwner() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await assert.assertRejects(
			() => removeMember(t.storage, vault.id, owner),
			CannotRemoveOwnerError,
		);
		assert.assertEquals(await userHasAccess(t.storage, owner, vault.id), true);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function removeMemberIsIdempotentForUnknownUser() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const stranger = await seedUser(t.storage, "stranger@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await removeMember(t.storage, vault.id, stranger);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function transferOwnershipSwapsRoles() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const member = await seedUser(t.storage, "member@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await addMember(t.storage, vault.id, member);
		await transferOwnership(t.storage, vault.id, owner, member);
		const ownerMembership = await getMembership(t.storage, owner, vault.id);
		const memberMembership = await getMembership(t.storage, member, vault.id);
		assert.assertEquals(ownerMembership?.role, "member");
		assert.assertEquals(memberMembership?.role, "owner");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function transferOwnershipRejectsNonOwnerCaller() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const a = await seedUser(t.storage, "a@x.io");
		const b = await seedUser(t.storage, "b@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await addMember(t.storage, vault.id, a);
		await addMember(t.storage, vault.id, b);
		await assert.assertRejects(
			() => transferOwnership(t.storage, vault.id, a, b),
			NotOwnerError,
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function transferOwnershipRejectsWhenTargetNotMember() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const stranger = await seedUser(t.storage, "stranger@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await assert.assertRejects(
			() => transferOwnership(t.storage, vault.id, owner, stranger),
			TargetNotMemberError,
		);
		const ownerMembership = await getMembership(t.storage, owner, vault.id);
		assert.assertEquals(ownerMembership?.role, "owner");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function transferOwnershipNoopWhenSelf() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const vault = await createVaultForUser(t.storage, owner);
		await transferOwnership(t.storage, vault.id, owner, owner);
		const ownerMembership = await getMembership(t.storage, owner, vault.id);
		assert.assertEquals(ownerMembership?.role, "owner");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function deleteVaultIsIdempotent() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "owner@x.io");
		const v = await createVaultForUser(t.storage, owner);
		await deleteVault(t.storage, v.id);
		await deleteVault(t.storage, v.id);
	} finally {
		t.cleanup();
	}
});
