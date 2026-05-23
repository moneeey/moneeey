import { assert } from "../test.ts";
import { passkeyUserId } from "./ids.ts";
import { makeTempStorage } from "./test_storage.ts";
import type { StoredCredential } from "./types.ts";
import {
	addCredential,
	createUser,
	getUserByEmail,
	getUserById,
	updateCredentialCounter,
} from "./users.ts";

const sampleCredential = (id = "cred-1"): StoredCredential => ({
	credentialId: id,
	publicKey: "AAAA",
	counter: 0,
	transports: ["internal"],
	createdAt: new Date().toISOString(),
});

Deno.test(async function createUserPersistsAndReturnsRecord() {
	const t = makeTempStorage();
	try {
		const created = await createUser(t.storage, "a@b.co", sampleCredential());
		const expectedId = await passkeyUserId("a@b.co");
		assert.assertEquals(created.id, expectedId);
		assert.assertEquals(created.email, "a@b.co");
		assert.assertEquals(created.credentials.length, 1);

		const fetched = await getUserByEmail(t.storage, "a@b.co");
		assert.assertEquals(fetched?.id, expectedId);

		const byId = await getUserById(t.storage, expectedId);
		assert.assertEquals(byId?.email, "a@b.co");
	} finally {
		t.cleanup();
	}
});

Deno.test(async function getUserByEmailReturnsNullWhenMissing() {
	const t = makeTempStorage();
	try {
		assert.assertEquals(await getUserByEmail(t.storage, "nope@x.io"), null);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function createUserRejectsDuplicateEmail() {
	const t = makeTempStorage();
	try {
		await createUser(t.storage, "dup@x.io", sampleCredential());
		await assert.assertRejects(() =>
			createUser(t.storage, "dup@x.io", sampleCredential("c2")),
		);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function addCredentialAppendsToList() {
	const t = makeTempStorage();
	try {
		await createUser(t.storage, "x@y.z", sampleCredential("c1"));
		const updated = await addCredential(t.storage, "x@y.z", sampleCredential("c2"));
		assert.assertEquals(updated.credentials.map((c) => c.credentialId), [
			"c1",
			"c2",
		]);
		const fetched = await getUserByEmail(t.storage, "x@y.z");
		assert.assertEquals(fetched?.credentials.length, 2);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function updateCredentialCounterPersists() {
	const t = makeTempStorage();
	try {
		await createUser(t.storage, "x@y.z", sampleCredential("c1"));
		await updateCredentialCounter(t.storage, "x@y.z", "c1", 42);
		const u = await getUserByEmail(t.storage, "x@y.z");
		assert.assertEquals(u?.credentials[0].counter, 42);
	} finally {
		t.cleanup();
	}
});

Deno.test(async function updateCredentialCounterRejectsUnknownCredential() {
	const t = makeTempStorage();
	try {
		await createUser(t.storage, "x@y.z", sampleCredential("c1"));
		await assert.assertRejects(() =>
			updateCredentialCounter(t.storage, "x@y.z", "missing", 1),
		);
	} finally {
		t.cleanup();
	}
});
