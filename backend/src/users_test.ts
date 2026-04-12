import { couchdbInternals } from "./couchdb.ts";
import { assert, withSpying } from "./test.ts";
import {
	type StoredInvite,
	createInvite,
	ensureUsersDbExists,
	usersInternals,
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

Deno.test(function pruneInvitesDropsRedeemedAndExpired() {
	const now = Date.now();
	const invites: StoredInvite[] = [
		{
			tokenHash: "active",
			createdAt: new Date(now).toISOString(),
			expiresAt: new Date(now + 60_000).toISOString(),
			redeemedBy: null,
		},
		{
			tokenHash: "redeemed",
			createdAt: new Date(now).toISOString(),
			expiresAt: new Date(now + 60_000).toISOString(),
			redeemedBy: "someone@test.com",
		},
		{
			tokenHash: "expired",
			createdAt: new Date(now - 120_000).toISOString(),
			expiresAt: new Date(now - 60_000).toISOString(),
			redeemedBy: null,
		},
	];
	const pruned = usersInternals.pruneInvites(invites);
	assert.assertEquals(pruned.length, 1);
	assert.assertEquals(pruned[0].tokenHash, "active");
});

Deno.test(async function createInviteEnforcesQuota() {
	const now = Date.now();
	const fullInvites: StoredInvite[] = Array.from({ length: 10 }, (_, i) => ({
		tokenHash: `t${i}`,
		createdAt: new Date(now).toISOString(),
		expiresAt: new Date(now + 60_000).toISOString(),
		redeemedBy: null,
	}));
	const fakeUser = {
		_id: "user:abc",
		email: "u@test.com",
		database: "db",
		credentials: [],
		invites: fullInvites,
		createdAt: new Date(now).toISOString(),
	};
	await withSpying({
		object: usersInternals,
		method: "updateUser",
		action: async (updateStub) => {
			updateStub.resolves(fakeUser);
			await withSpying({
				object: couchdbInternals,
				method: "dbApi",
				action: async (apiStub) => {
					apiStub.resolves({
						status: 200,
						json: () => Promise.resolve(fakeUser),
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
		},
	});
});
