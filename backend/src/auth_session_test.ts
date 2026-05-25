import { authSessionInternals } from "./auth_session.ts";
import { setStorageForTest } from "./data/storage_singleton.ts";
import { makeTempStorage } from "./data/test_storage.ts";
import { createUser } from "./data/users.ts";
import { createVaultForUser, getVaultsByUser } from "./data/vaults.ts";
import { assert } from "./test.ts";

Deno.test(async function resolvePrimaryVaultIdReturnsExistingVault() {
	const t = makeTempStorage();
	setStorageForTest(t.storage);
	try {
		const u = await createUser(t.storage, "Alice");
		const v = await createVaultForUser(t.storage, u.id, "Alice's vault");
		const resolved = await authSessionInternals.resolvePrimaryVaultId(u.id);
		assert.assertEquals(resolved, v.id);
	} finally {
		setStorageForTest(null);
		t.cleanup();
	}
});

Deno.test(async function resolvePrimaryVaultIdCreatesVaultIfMissing() {
	const t = makeTempStorage();
	setStorageForTest(t.storage);
	try {
		const u = await createUser(t.storage, "Alice");
		assert.assertEquals((await getVaultsByUser(t.storage, u.id)).length, 0);
		const resolved = await authSessionInternals.resolvePrimaryVaultId(u.id);
		assert.assertEquals(typeof resolved, "string");
		const vaults = await getVaultsByUser(t.storage, u.id);
		assert.assertEquals(vaults.length, 1);
		assert.assertEquals(vaults[0].name, "Alice's vault");
	} finally {
		setStorageForTest(null);
		t.cleanup();
	}
});
