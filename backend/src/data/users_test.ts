import { assert } from "../test.ts";
import { makeTempStorage } from "./test_storage.ts";
import type { StoredPasskey } from "./types.ts";
import {
	addPasskey,
	createUser,
	getPasskeysByUserId,
	getUserByCredentialId,
	getUserById,
	replacePasskeys,
	updateDisplayName,
	updatePasskeyCounter,
} from "./users.ts";

const samplePasskey = (id = "cred-1"): Omit<StoredPasskey, "userId"> => ({
	credentialId: id,
	publicKey: "AAAA",
	counter: 0,
	transports: ["internal"],
	createdAt: new Date().toISOString(),
});

Deno.test(async function createUserPersistsAndReturnsRecord() {
	const t = makeTempStorage();
	try {
		const created = await createUser(t.storage, "Alice");
		assert.assertEquals(created.displayName, "Alice");
		assert.assertEquals(typeof created.id, "string");
		assert.assertEquals(created.id.startsWith("u"), true);

		const byId = await getUserById(t.storage, created.id);
		assert.assertEquals(byId?.displayName, "Alice");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getUserByIdReturnsNullWhenMissing() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await getUserById(t.storage, "u-nope"), null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function addPasskeyPersistsAndLooksUpByCredential() {
	const t = makeTempStorage();
	try {
		const user = await createUser(t.storage, "Bob");
		await addPasskey(t.storage, user.id, samplePasskey("cred-x"));
		const lookup = await getUserByCredentialId(t.storage, "cred-x");
		assert.assertExists(lookup);
		assert.assertEquals(lookup?.user.id, user.id);
		assert.assertEquals(lookup?.passkey.credentialId, "cred-x");
		assert.assertEquals(lookup?.passkey.userId, user.id);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getUserByCredentialIdReturnsNullForUnknown() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(
			await getUserByCredentialId(t.storage, "no-such"),
			null,
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getPasskeysByUserIdReturnsAll() {
	const t = makeTempStorage();
	try {
		const user = await createUser(t.storage, "Carol");
		await addPasskey(t.storage, user.id, samplePasskey("c1"));
		await addPasskey(t.storage, user.id, samplePasskey("c2"));
		const passkeys = await getPasskeysByUserId(t.storage, user.id);
		assert.assertEquals(passkeys.map((p) => p.credentialId).sort(), [
			"c1",
			"c2",
		]);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function updatePasskeyCounterPersists() {
	const t = makeTempStorage();
	try {
		const user = await createUser(t.storage, "Dan");
		await addPasskey(t.storage, user.id, samplePasskey("c1"));
		await updatePasskeyCounter(t.storage, "c1", 42);
		const lookup = await getUserByCredentialId(t.storage, "c1");
		assert.assertEquals(lookup?.passkey.counter, 42);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function updatePasskeyCounterRejectsUnknownCredential() {
	const t = makeTempStorage();
	try {
		await assert.assertRejects(() =>
			updatePasskeyCounter(t.storage, "missing", 1),
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function replacePasskeysSwapsAllPasskeys() {
	const t = makeTempStorage();
	try {
		const user = await createUser(t.storage, "Eve");
		await addPasskey(t.storage, user.id, samplePasskey("old1"));
		await addPasskey(t.storage, user.id, samplePasskey("old2"));
		await replacePasskeys(t.storage, user.id, samplePasskey("fresh"));
		const passkeys = await getPasskeysByUserId(t.storage, user.id);
		assert.assertEquals(passkeys.length, 1);
		assert.assertEquals(passkeys[0].credentialId, "fresh");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function updateDisplayNameChangesIt() {
	const t = makeTempStorage();
	try {
		const user = await createUser(t.storage, "Frank");
		await updateDisplayName(t.storage, user.id, "Franklin");
		const after = await getUserById(t.storage, user.id);
		assert.assertEquals(after?.displayName, "Franklin");
	} finally {
		t.cleanup();
	}
});
