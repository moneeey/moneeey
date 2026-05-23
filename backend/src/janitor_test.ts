import { makeTempStorage } from "./data/test_storage.ts";
import { createUser } from "./data/users.ts";
import { addMember, createVaultForUser } from "./data/vaults.ts";
import { fs } from "./deps.ts";
import { purgeStaleTestUsers } from "./janitor.ts";
import { assert } from "./test.ts";

const cred = (id = "c") => ({
	credentialId: id,
	publicKey: "AA",
	counter: 0,
	createdAt: new Date().toISOString(),
});

const twoDaysAgo = () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

const backdateUser = async (
	storage: Awaited<ReturnType<typeof makeTempStorage>>["storage"],
	userId: string,
	when: Date,
) => {
	await storage.withMeta((db) => {
		db.prepare("UPDATE users SET created_at = ? WHERE id = ?").run(
			when.toISOString(),
			userId,
		);
	});
};

Deno.test(async function purgesTestUserPlusOwnedVault() {
	const t = makeTempStorage();
	try {
		const u = await createUser(t.storage, "old@playwright.local", cred());
		const v = await createVaultForUser(t.storage, u.id);
		await backdateUser(t.storage, u.id, twoDaysAgo());
		const path = t.storage.vaultPath(v.id);
		assert.assertEquals(fs.existsSync(path), true);

		const result = await purgeStaleTestUsers(t.storage);
		assert.assertEquals(result.usersDeleted, 1);
		assert.assertEquals(result.vaultsDeleted, 1);
		assert.assertEquals(fs.existsSync(path), false);

		const remaining = await t.storage.withMeta(
			(db) =>
				db
					.prepare("SELECT COUNT(*) AS n FROM users WHERE id = ?")
					.get<{ n: number }>(u.id)?.n,
		);
		assert.assertEquals(remaining, 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function leavesNonTestUsersAlone() {
	const t = makeTempStorage();
	try {
		const real = await createUser(t.storage, "alice@example.com", cred());
		await createVaultForUser(t.storage, real.id);
		await backdateUser(t.storage, real.id, twoDaysAgo());

		const result = await purgeStaleTestUsers(t.storage);
		assert.assertEquals(result.usersDeleted, 0);
		assert.assertEquals(result.vaultsDeleted, 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function leavesRecentTestUsersAlone() {
	const t = makeTempStorage();
	try {
		const u = await createUser(t.storage, "fresh@playwright.local", cred());
		await createVaultForUser(t.storage, u.id);
		const result = await purgeStaleTestUsers(t.storage);
		assert.assertEquals(result.usersDeleted, 0);
		assert.assertEquals(result.vaultsDeleted, 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function membershipsCascadeButSharedVaultSurvives() {
	const t = makeTempStorage();
	try {
		const owner = await createUser(t.storage, "owner@example.com", cred("a"));
		const guest = await createUser(
			t.storage,
			"guest@playwright.local",
			cred("b"),
		);
		const vault = await createVaultForUser(t.storage, owner.id);
		await addMember(t.storage, vault.id, guest.id);
		await backdateUser(t.storage, guest.id, twoDaysAgo());

		const result = await purgeStaleTestUsers(t.storage);
		assert.assertEquals(result.usersDeleted, 1);
		assert.assertEquals(result.vaultsDeleted, 0);

		assert.assertEquals(fs.existsSync(t.storage.vaultPath(vault.id)), true);
		const membersLeft = await t.storage.withMeta(
			(db) =>
				db
					.prepare("SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?")
					.get<{ n: number }>(vault.id)?.n,
		);
		assert.assertEquals(membersLeft, 1);
	} finally {
		t.cleanup();
	}
});
