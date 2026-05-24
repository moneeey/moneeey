import { authMembershipInternals } from "./auth_membership.ts";
import {
	CannotRemoveOwnerError,
	NotOwnerError,
	TargetNotMemberError,
} from "./data/vaults.ts";
import {
	assert,
	assertResponse,
	runServerRequest,
	withSpying,
} from "./test.ts";

const stubAuthed = (
	value: { email: string; userId: string } | null,
	action: () => Promise<void>,
) =>
	withSpying({
		object: authMembershipInternals,
		method: "readAuthed",
		action: async (stub) => {
			stub.resolves(value);
			await action();
		},
	});

Deno.test(async function vaultsListRequiresAuth() {
	await stubAuthed(null, async () => {
		const { resp } = await runServerRequest(
			"POST",
			"/api/auth/vaults/list",
			{},
		);
		assertResponse(resp, 401, { error: "not authenticated" });
	});
});

Deno.test(async function vaultsListReturnsVaultsWithRoles() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getVaultsByUser",
			action: async (vstub) => {
				vstub.resolves([
					{ id: "v1", createdAt: "2020-01-01" },
					{ id: "v2", createdAt: "2020-02-02" },
				]);
				await withSpying({
					object: authMembershipInternals,
					method: "getMembership",
					action: async (mstub) => {
						mstub.onFirstCall().resolves({
							userId: "u1",
							vaultId: "v1",
							role: "owner",
							addedAt: "2020-01-01",
						});
						mstub.onSecondCall().resolves({
							userId: "u1",
							vaultId: "v2",
							role: "member",
							addedAt: "2020-02-02",
						});
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vaults/list",
							{},
						);
						assert.assertEquals(resp.status, 200);
						const body = await resp.json();
						assert.assertEquals(body.vaults, [
							{ vaultId: "v1", role: "owner", createdAt: "2020-01-01" },
							{ vaultId: "v2", role: "member", createdAt: "2020-02-02" },
						]);
					},
				});
			},
		});
	});
});

Deno.test(async function vaultSelectRequiresMembership() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves(null);
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/select",
					{ vaultId: "v9" },
				);
				assertResponse(resp, 403, { error: "not a member" });
			},
		});
	});
});

Deno.test(async function vaultSelectRejectsMissingVaultId() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		const { resp } = await runServerRequest(
			"POST",
			"/api/auth/vault/select",
			{},
		);
		assertResponse(resp, 400, { error: "missing vaultId" });
	});
});

Deno.test(async function vaultSelectIssuesSessionToken() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "member",
					addedAt: "2020-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "authenticateAndRespond",
					action: async (astub) => {
						astub.resolves({
							authenticated: true,
							vaultId: "v1",
							sessionToken: "TOKEN",
						});
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/select",
							{ vaultId: "v1" },
						);
						assertResponse(resp, 200, {
							authenticated: true,
							vaultId: "v1",
							sessionToken: "TOKEN",
						});
					},
				});
			},
		});
	});
});

Deno.test(async function vaultMembersRequiresMembership() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves(null);
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/members",
					{ vaultId: "v1" },
				);
				assertResponse(resp, 403, { error: "not a member" });
			},
		});
	});
});

Deno.test(async function vaultMembersReturnsList() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "owner",
					addedAt: "2020-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "listVaultMembers",
					action: async (lstub) => {
						lstub.resolves([
							{
								userId: "u1",
								vaultId: "v1",
								role: "owner",
								addedAt: "2020-01-01",
								email: "u@x.io",
							},
							{
								userId: "u2",
								vaultId: "v1",
								role: "member",
								addedAt: "2020-02-01",
								email: "m@x.io",
							},
						]);
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/members",
							{ vaultId: "v1" },
						);
						assert.assertEquals(resp.status, 200);
						const body = await resp.json();
						assert.assertEquals(body.yourRole, "owner");
						assert.assertEquals(body.yourUserId, "u1");
						assert.assertEquals(body.members.length, 2);
						assert.assertEquals(body.members[0].email, "u@x.io");
						assert.assertEquals(body.members[1].email, "m@x.io");
					},
				});
			},
		});
	});
});

Deno.test(async function vaultKickRequiresOwner() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "member",
					addedAt: "2020-01-01",
				});
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/kick",
					{ vaultId: "v1", userId: "u2" },
				);
				assertResponse(resp, 403, { error: "not owner" });
			},
		});
	});
});

Deno.test(async function vaultKickRefusesSelf() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "owner",
					addedAt: "2020-01-01",
				});
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/kick",
					{ vaultId: "v1", userId: "u1" },
				);
				assertResponse(resp, 400, { error: "cannot kick self" });
			},
		});
	});
});

Deno.test(async function vaultKickRemovesMember() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "owner",
					addedAt: "2020-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "removeMember",
					action: async (rstub) => {
						rstub.resolves(undefined);
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/kick",
							{ vaultId: "v1", userId: "u2" },
						);
						assertResponse(resp, 200, { removed: true });
					},
				});
			},
		});
	});
});

Deno.test(async function vaultKickReportsCannotRemoveOwner() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "owner",
					addedAt: "2020-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "removeMember",
					action: async (rstub) => {
						rstub.rejects(new CannotRemoveOwnerError());
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/kick",
							{ vaultId: "v1", userId: "u2" },
						);
						assertResponse(resp, 400, { error: "cannot_remove_owner" });
					},
				});
			},
		});
	});
});

Deno.test(async function vaultTransferRejectsNonOwner() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "transferOwnership",
			action: async (tstub) => {
				tstub.rejects(new NotOwnerError());
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/transfer",
					{ vaultId: "v1", userId: "u2" },
				);
				assertResponse(resp, 403, { error: "not owner" });
			},
		});
	});
});

Deno.test(async function vaultTransferRejectsTargetNotMember() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "transferOwnership",
			action: async (tstub) => {
				tstub.rejects(new TargetNotMemberError());
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/transfer",
					{ vaultId: "v1", userId: "u2" },
				);
				assertResponse(resp, 400, { error: "target_not_member" });
			},
		});
	});
});

Deno.test(async function vaultTransferSuccess() {
	await stubAuthed({ email: "u@x.io", userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "transferOwnership",
			action: async (tstub) => {
				tstub.resolves(undefined);
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/transfer",
					{ vaultId: "v1", userId: "u2" },
				);
				assertResponse(resp, 200, { transferred: true });
			},
		});
	});
});
