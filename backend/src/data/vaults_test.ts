import type { Storage } from "../db/storage.ts";
import { fs } from "../deps.ts";
import { assert } from "../test.ts";
import { makeTempStorage } from "./test_storage.ts";
import { createUser } from "./users.ts";
import {
	CannotRemoveOwnerError,
	DEFAULT_VAULT_NAME,
	MAX_USERS_PER_VAULT,
	NotOwnerError,
	TargetNotMemberError,
	VaultFullError,
	addMember,
	countMembers,
	createVaultForUser,
	defaultVaultNameFor,
	deleteVault,
	getMembership,
	getVaultsByUser,
	listVaultMembers,
	removeMember,
	renameVault,
	transferOwnership,
	userHasAccess,
} from "./vaults.ts";

const seedUser = async (storage: Storage, displayName: string) => {
	const u = await createUser(storage, displayName);
	return u.id;
};

const newVault = async (
	storage: Storage,
	userId: string,
	name = "Test vault",
) => createVaultForUser(storage, userId, name);

Deno.test(async function defaultVaultNameForFormatsNicely() {
	assert.assertEquals(defaultVaultNameFor("Alice"), "Alice's vault");
	assert.assertEquals(defaultVaultNameFor("  Bob  "), "Bob's vault");
	assert.assertEquals(defaultVaultNameFor(""), DEFAULT_VAULT_NAME);
	assert.assertEquals(defaultVaultNameFor("   "), DEFAULT_VAULT_NAME);
});

Deno.test(async function createVaultForUserCreatesRowMembershipAndFile() {
	const t = makeTempStorage();
	try {
		const userId = await seedUser(t.storage, "Alice");
		const v = await newVault(t.storage, userId, "Alice's vault");
		assert.assertEquals(typeof v.id, "string");
		assert.assertEquals(v.id.length, 21);
		assert.assertEquals(v.name, "Alice's vault");
		assert.assertEquals(fs.existsSync(t.storage.vaultPath(v.id)), true);
		const membership = await getMembership(t.storage, userId, v.id);
		assert.assertEquals(membership?.role, "owner");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function createVaultFallsBackToDefaultNameWhenBlank() {
	const t = makeTempStorage();
	try {
		const userId = await seedUser(t.storage, "Alice");
		const v = await newVault(t.storage, userId, "   ");
		assert.assertEquals(v.name, DEFAULT_VAULT_NAME);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function renameVaultUpdatesName() {
	const t = makeTempStorage();
	try {
		const userId = await seedUser(t.storage, "Alice");
		const v = await newVault(t.storage, userId);
		await renameVault(t.storage, v.id, "Family vault");
		const vaults = await getVaultsByUser(t.storage, userId);
		assert.assertEquals(vaults[0].name, "Family vault");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function renameVaultRejectsEmpty() {
	const t = makeTempStorage();
	try {
		const userId = await seedUser(t.storage, "Alice");
		const v = await newVault(t.storage, userId);
		await assert.assertRejects(
			() => renameVault(t.storage, v.id, "   "),
			Error,
			"vault_name_empty",
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getVaultsByUserReturnsAllOwnedAndShared() {
	const t = makeTempStorage();
	try {
		const userA = await seedUser(t.storage, "A");
		const userB = await seedUser(t.storage, "B");
		const a = await newVault(t.storage, userA);
		const b = await newVault(t.storage, userB);
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
		const owner = await seedUser(t.storage, "Owner");
		const stranger = await seedUser(t.storage, "Stranger");
		const v = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const guest = await seedUser(t.storage, "Guest");
		const v = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const v = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
		for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
			const u = await seedUser(t.storage, `u${i}`);
			await addMember(t.storage, vault.id, u);
		}
		assert.assertEquals(
			await countMembers(t.storage, vault.id),
			MAX_USERS_PER_VAULT,
		);
		const extra = await seedUser(t.storage, "extra");
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
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
		for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
			const u = await seedUser(t.storage, `u${i}`);
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
		const owner = await seedUser(t.storage, "Owner");
		const m1 = await seedUser(t.storage, "Member1");
		const m2 = await seedUser(t.storage, "Member2");
		const vault = await newVault(t.storage, owner);
		await addMember(t.storage, vault.id, m1);
		await addMember(t.storage, vault.id, m2);
		const members = await listVaultMembers(t.storage, vault.id);
		assert.assertEquals(members.length, 3);
		assert.assertEquals(members[0].role, "owner");
		assert.assertEquals(members[0].displayName, "Owner");
		assert.assertEquals(
			members
				.slice(1)
				.map((m) => m.displayName)
				.sort(),
			["Member1", "Member2"],
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
		const owner = await seedUser(t.storage, "Owner");
		const guest = await seedUser(t.storage, "Guest");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const stranger = await seedUser(t.storage, "Stranger");
		const vault = await newVault(t.storage, owner);
		await removeMember(t.storage, vault.id, stranger);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function transferOwnershipSwapsRoles() {
	const t = makeTempStorage();
	try {
		const owner = await seedUser(t.storage, "Owner");
		const member = await seedUser(t.storage, "Member");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const a = await seedUser(t.storage, "A");
		const b = await seedUser(t.storage, "B");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const stranger = await seedUser(t.storage, "Stranger");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const vault = await newVault(t.storage, owner);
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
		const owner = await seedUser(t.storage, "Owner");
		const v = await newVault(t.storage, owner);
		await deleteVault(t.storage, v.id);
		await deleteVault(t.storage, v.id);
	} finally {
		t.cleanup();
	}
});
