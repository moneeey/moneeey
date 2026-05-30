import { TEST_DISPLAY_NAME_PREFIX } from "./data/ids.ts";
import { makeTempStorage } from "./data/test_storage.ts";
import { createUser } from "./data/users.ts";
import { addMember, createVaultForUser, userHasAccess } from "./data/vaults.ts";
import { purgeStaleTestUsers } from "./janitor.ts";
import { assert } from "./test.ts";

const twoDaysAgo = () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

const backdateUser = async (
	storage: Awaited<ReturnType<typeof makeTempStorage>>["storage"],
	userId: string,
	when: Date,
) => {
	await storage.withMeta((conn) =>
		conn.run(
			"UPDATE users SET created_at = ? WHERE id = ?",
			when.toISOString(),
			userId,
		),
	);
};

const testName = (suffix: string) => `${TEST_DISPLAY_NAME_PREFIX}${suffix}`;

const seedVaultFor = async (
	storage: Awaited<ReturnType<typeof makeTempStorage>>["storage"],
	userId: string,
) => createVaultForUser(storage, userId, "Test vault");

Deno.test(async function purgesTestUserPlusOwnedVault() {
	const t = makeTempStorage();
	try {
		const u = await createUser(t.storage, testName("old"));
		const v = await seedVaultFor(t.storage, u.id);
		await backdateUser(t.storage, u.id, twoDaysAgo());
		assert.assertEquals(await userHasAccess(t.storage, u.id, v.id), true);

		const result = await purgeStaleTestUsers(t.storage);
		assert.assertEquals(result.usersDeleted, 1);
		assert.assertEquals(result.vaultsDeleted, 1);
		assert.assertEquals(await userHasAccess(t.storage, u.id, v.id), false);

		const remaining = await t.storage.withMeta(async (conn) => {
			const row = await conn.get<{ n: number }>(
				"SELECT COUNT(*) AS n FROM users WHERE id = ?",
				u.id,
			);
			return row?.n;
		});
		assert.assertEquals(remaining, 0);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function leavesNonTestUsersAlone() {
	const t = makeTempStorage();
	try {
		const real = await createUser(t.storage, "Alice");
		await seedVaultFor(t.storage, real.id);
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
		const u = await createUser(t.storage, testName("fresh"));
		await seedVaultFor(t.storage, u.id);
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
		const owner = await createUser(t.storage, "Owner");
		const guest = await createUser(t.storage, testName("guest"));
		const vault = await seedVaultFor(t.storage, owner.id);
		await addMember(t.storage, vault.id, guest.id);
		await backdateUser(t.storage, guest.id, twoDaysAgo());

		const result = await purgeStaleTestUsers(t.storage);
		assert.assertEquals(result.usersDeleted, 1);
		assert.assertEquals(result.vaultsDeleted, 0);

		assert.assertEquals(
			await userHasAccess(t.storage, owner.id, vault.id),
			true,
		);
		const membersLeft = await t.storage.withMeta(async (conn) => {
			const row = await conn.get<{ n: number }>(
				"SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?",
				vault.id,
			);
			return row?.n;
		});
		assert.assertEquals(membersLeft, 1);
	} finally {
		t.cleanup();
	}
});
