import { couchdbInternals } from "./couchdb.ts";
import { assert, withSpying } from "./test.ts";
import {
	type InviteDocument,
	type StoredCredential,
	type UserDocument,
	createInvite,
	createUserWithDatabase,
	ensureUsersDbExists,
	generateShortDbId,
} from "./users.ts";

const USERS_DB = "accounts";

Deno.test(async function ensureUsersDbExistsLocksDownSecurity() {
	await withSpying({
		object: couchdbInternals,
		method: "dbExists",
		action: async (existsStub) => {
			existsStub.resolves(false);
			await withSpying({
				object: couchdbInternals,
				method: "dbCreate",
				action: async (createStub) => {
					createStub.resolves();
					await withSpying({
						object: couchdbInternals,
						method: "dbSecurityApply",
						action: async (secStub) => {
							secStub.resolves();
							await withSpying({
								object: couchdbInternals,
								method: "dbApi",
								action: async (apiStub) => {
									apiStub.resolves({ status: 200 });
									await ensureUsersDbExists();
									assert.assertEquals(secStub.callCount, 1);
									assert.assertEquals(secStub.firstCall.args, [USERS_DB, []]);
								},
							});
						},
					});
				},
			});
		},
	});
});

Deno.test(async function ensureUsersDbExistsSkipsRecreateWhenPresent() {
	await withSpying({
		object: couchdbInternals,
		method: "dbExists",
		action: async (existsStub) => {
			existsStub.resolves(true);
			await withSpying({
				object: couchdbInternals,
				method: "dbCreate",
				action: async (createStub) => {
					createStub.resolves();
					await withSpying({
						object: couchdbInternals,
						method: "dbSecurityApply",
						action: async (secStub) => {
							secStub.resolves();
							await withSpying({
								object: couchdbInternals,
								method: "dbApi",
								action: async (apiStub) => {
									apiStub.resolves({ status: 200 });
									await ensureUsersDbExists();
									assert.assertEquals(createStub.callCount, 0);
									assert.assertEquals(secStub.callCount, 0);
								},
							});
						},
					});
				},
			});
		},
	});
});

Deno.test(async function createInviteEnforcesQuota() {
	const now = Date.now();
	const fakeUser = {
		_id: "user:abc",
		type: "user" as const,
		email: "u@test.com",
		database: "db",
		credentials: [],
		createdAt: new Date(now).toISOString(),
	};
	const fakeActiveInvites: Partial<InviteDocument>[] = Array.from(
		{ length: 10 },
		(_, i) => ({ _id: `invite:t${i}` }),
	);
	await withSpying({
		object: couchdbInternals,
		method: "dbApi",
		action: async (apiStub) => {
			// First call: GET user; second call: POST _find for active invites.
			apiStub.onCall(0).resolves({
				status: 200,
				json: () => Promise.resolve(fakeUser),
			});
			apiStub.onCall(1).resolves({
				status: 200,
				json: () => Promise.resolve({ docs: fakeActiveInvites }),
			});
			let thrown: Error | undefined;
			try {
				await createInvite("u@test.com");
			} catch (err) {
				thrown = err as Error;
			}
			assert.assertEquals(thrown?.message, "invite_quota_exceeded");
		},
	});
});

const fakeCredential: StoredCredential = {
	credentialId: "cred-1",
	publicKey: "pk",
	counter: 0,
	createdAt: new Date().toISOString(),
};

Deno.test(async function createUserWithDatabasePersistsShortName() {
	await withSpying({
		object: couchdbInternals,
		method: "createUserDatabase",
		action: async (createDbStub) => {
			createDbStub.resolves(true);
			await withSpying({
				object: couchdbInternals,
				method: "dbApi",
				action: async (apiStub) => {
					apiStub.resolves({
						status: 201,
						json: () => Promise.resolve({ rev: "1-x" }),
					});
					const user = await createUserWithDatabase(
						"u@test.com",
						fakeCredential,
					);
					assert.assertEquals(createDbStub.callCount, 1);
					assert.assertEquals(user.database.length, 23);
					assert.assertEquals(user.database.startsWith("db"), true);
					assert.assertMatch(user.database, /^db[a-z0-9]{21}$/);
					assert.assertEquals(createDbStub.firstCall.args[0], user.database);
					assert.assertEquals(createDbStub.firstCall.args[1], "u@test.com");
					const putCall = apiStub.getCall(0);
					assert.assertEquals(putCall.args[0], "PUT");
					const body = putCall.args[2] as UserDocument;
					assert.assertEquals(body.database, user.database);
				},
			});
		},
	});
});

Deno.test(async function createUserWithDatabaseRetriesOnCollision() {
	await withSpying({
		object: couchdbInternals,
		method: "createUserDatabase",
		action: async (createDbStub) => {
			createDbStub.onCall(0).resolves(false);
			createDbStub.onCall(1).resolves(false);
			createDbStub.onCall(2).resolves(true);
			await withSpying({
				object: couchdbInternals,
				method: "dbApi",
				action: async (apiStub) => {
					apiStub.resolves({
						status: 201,
						json: () => Promise.resolve({ rev: "1-x" }),
					});
					const user = await createUserWithDatabase(
						"u@test.com",
						fakeCredential,
					);
					assert.assertEquals(createDbStub.callCount, 3);
					const thirdAttempt = createDbStub.getCall(2).args[0] as string;
					assert.assertEquals(user.database, thirdAttempt);
					const first = createDbStub.getCall(0).args[0] as string;
					const second = createDbStub.getCall(1).args[0] as string;
					assert.assertNotEquals(first, second);
					assert.assertNotEquals(second, thirdAttempt);
				},
			});
		},
	});
});

Deno.test(async function createUserWithDatabaseThrowsAfterExhaustion() {
	await withSpying({
		object: couchdbInternals,
		method: "createUserDatabase",
		action: async (createDbStub) => {
			createDbStub.resolves(false);
			await withSpying({
				object: couchdbInternals,
				method: "dbApi",
				action: async (apiStub) => {
					apiStub.resolves({
						status: 201,
						json: () => Promise.resolve({ rev: "1-x" }),
					});
					let thrown: Error | undefined;
					try {
						await createUserWithDatabase("u@test.com", fakeCredential);
					} catch (err) {
						thrown = err as Error;
					}
					assert.assertEquals(
						thrown?.message,
						"failed to allocate user database after retries",
					);
					assert.assertEquals(createDbStub.callCount, 5);
					assert.assertEquals(apiStub.callCount, 0);
				},
			});
		},
	});
});

Deno.test(function generateShortDbIdProducesExpectedShape() {
	const id = generateShortDbId(21);
	assert.assertEquals(id.length, 21);
	assert.assertMatch(id, /^[a-z0-9]{21}$/);
	const other = generateShortDbId(21);
	assert.assertNotEquals(id, other);
	const short = generateShortDbId(8);
	assert.assertEquals(short.length, 8);
	assert.assertMatch(short, /^[a-z0-9]{8}$/);
});

Deno.test(async function createInviteAllowsBelowQuota() {
	const now = Date.now();
	const fakeUser = {
		_id: "user:abc",
		type: "user" as const,
		email: "u@test.com",
		database: "db",
		credentials: [],
		createdAt: new Date(now).toISOString(),
	};
	await withSpying({
		object: couchdbInternals,
		method: "dbApi",
		action: async (apiStub) => {
			apiStub.onCall(0).resolves({
				status: 200,
				json: () => Promise.resolve(fakeUser),
			});
			apiStub.onCall(1).resolves({
				status: 200,
				json: () => Promise.resolve({ docs: [] }),
			});
			apiStub.onCall(2).resolves({
				status: 201,
				json: () => Promise.resolve({ rev: "1-x" }),
			});
			const token = await createInvite("u@test.com");
			assert.assertEquals(typeof token, "string");
			assert.assertEquals(token.length, 64);
			// Verify the PUT went to invite:<hash>
			const putCall = apiStub.getCall(2);
			assert.assertEquals(putCall.args[0], "PUT");
			assert.assertEquals(
				(putCall.args[1] as string).startsWith(`${USERS_DB}/invite:`),
				true,
			);
			const body = putCall.args[2] as InviteDocument;
			assert.assertEquals(body.type, "invite");
			assert.assertEquals(body.ownerEmail, "u@test.com");
			assert.assertEquals(body.database, "db");
			assert.assertEquals(body.redeemedBy, null);
		},
	});
});
