import { couchdbInternals } from "./couchdb.ts";
import { assert, withSpying } from "./test.ts";
import {
	type InviteDocument,
	createInvite,
	ensureUsersDbExists,
} from "./users.ts";

const USERS_DB = "moneeey_users";

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
