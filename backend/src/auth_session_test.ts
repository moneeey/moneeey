import { authSessionInternals } from "./auth_session.ts";
import { setStorageForTest } from "./data/storage_singleton.ts";
import { makeTempStorage } from "./data/test_storage.ts";
import { createUser } from "./data/users.ts";
import { createVaultForUser, getVaultsByUser } from "./data/vaults.ts";
import { assert } from "./test.ts";

const cred = () => ({
	credentialId: "c1",
	publicKey: "AA",
	counter: 0,
	createdAt: new Date().toISOString(),
});

Deno.test(async function resolvePrimaryVaultIdReturnsExistingVault() {
	const t = makeTempStorage();
	setStorageForTest(t.storage);
	try {
		const u = await createUser(t.storage, "a@b.co", cred());
		const v = await createVaultForUser(t.storage, u.id);
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
		const u = await createUser(t.storage, "a@b.co", cred());
		assert.assertEquals((await getVaultsByUser(t.storage, u.id)).length, 0);
		const resolved = await authSessionInternals.resolvePrimaryVaultId(u.id);
		assert.assertEquals(typeof resolved, "string");
		assert.assertEquals((await getVaultsByUser(t.storage, u.id)).length, 1);
	} finally {
		setStorageForTest(null);
		t.cleanup();
	}
});
