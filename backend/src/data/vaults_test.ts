import type { Storage } from "../db/storage.ts";
import { fs } from "../deps.ts";
import { assert } from "../test.ts";
import { makeTempStorage } from "./test_storage.ts";
import type { StoredCredential } from "./types.ts";
import { createUser } from "./users.ts";
import {
	addMember,
	createVaultForUser,
	deleteVault,
	getMembership,
	getVaultsByUser,
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
