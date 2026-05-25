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
	value: { userId: string } | null,
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
	await stubAuthed({ userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getVaultsByUser",
			action: async (vstub) => {
				vstub.resolves([
					{ id: "v1", name: "First", createdAt: "2020-01-01" },
					{ id: "v2", name: "Second", createdAt: "2020-02-02" },
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
							{
								vaultId: "v1",
								name: "First",
								role: "owner",
								createdAt: "2020-01-01",
							},
							{
								vaultId: "v2",
								name: "Second",
								role: "member",
								createdAt: "2020-02-02",
							},
						]);
					},
				});
			},
		});
	});
});

Deno.test(async function vaultSelectRequiresMembership() {
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
		const { resp } = await runServerRequest(
			"POST",
			"/api/auth/vault/select",
			{},
		);
		assertResponse(resp, 400, { error: "missing vaultId" });
	});
});

Deno.test(async function vaultSelectIssuesSessionToken() {
	await stubAuthed({ userId: "u1" }, async () => {
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

Deno.test(async function vaultRenameRequiresOwner() {
	await stubAuthed({ userId: "u1" }, async () => {
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
					"/api/auth/vault/rename",
					{ vaultId: "v1", name: "Renamed" },
				);
				assertResponse(resp, 403, { error: "not owner" });
			},
		});
	});
});

Deno.test(async function vaultRenameSucceedsForOwner() {
	await stubAuthed({ userId: "u1" }, async () => {
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
					method: "renameVault",
					action: async (rstub) => {
						rstub.resolves(undefined);
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/rename",
							{ vaultId: "v1", name: "Renamed" },
						);
						assertResponse(resp, 200, { renamed: true });
					},
				});
			},
		});
	});
});

Deno.test(async function vaultMembersRequiresMembership() {
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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
								displayName: "Owner",
							},
							{
								userId: "u2",
								vaultId: "v1",
								role: "member",
								addedAt: "2020-02-01",
								displayName: "Member",
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
						assert.assertEquals(body.members[0].displayName, "Owner");
						assert.assertEquals(body.members[1].displayName, "Member");
					},
				});
			},
		});
	});
});

Deno.test(async function vaultKickRequiresOwner() {
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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
	await stubAuthed({ userId: "u1" }, async () => {
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

Deno.test(async function vaultCreateRequiresAuth() {
	await stubAuthed(null, async () => {
		const { resp } = await runServerRequest(
			"POST",
			"/api/auth/vault/create",
			{ name: "x" },
		);
		assertResponse(resp, 401, { error: "not authenticated" });
	});
});

Deno.test(async function vaultCreateUsesProvidedName() {
	await stubAuthed({ userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "createVaultForUser",
			action: async (cstub) => {
				cstub.resolves({
					id: "vNEW",
					name: "Family",
					createdAt: "2026-01-01",
				});
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/create",
					{ name: "Family" },
				);
				assertResponse(resp, 200, {
					vaultId: "vNEW",
					name: "Family",
					createdAt: "2026-01-01",
				});
				const [, , name] = cstub.firstCall.args as [unknown, string, string];
				assert.assertEquals(name, "Family");
			},
		});
	});
});

Deno.test(async function vaultCreateFallsBackToDisplayName() {
	await stubAuthed({ userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getUserById",
			action: async (ustub) => {
				ustub.resolves({
					id: "u1",
					displayName: "Alice",
					createdAt: "2026-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "createVaultForUser",
					action: async (cstub) => {
						cstub.resolves({
							id: "vNEW",
							name: "Alice's vault",
							createdAt: "2026-01-01",
						});
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/create",
							{ name: "   " },
						);
						assert.assertEquals(resp.status, 200);
						const [, , name] = cstub.firstCall.args as [
							unknown,
							string,
							string,
						];
						assert.assertEquals(name, "Alice's vault");
					},
				});
			},
		});
	});
});

Deno.test(async function vaultDeleteRequiresAuth() {
	await stubAuthed(null, async () => {
		const { resp } = await runServerRequest(
			"POST",
			"/api/auth/vault/delete",
			{ vaultId: "v1" },
		);
		assertResponse(resp, 401, { error: "not authenticated" });
	});
});

Deno.test(async function vaultDeleteRejectsMissingVaultId() {
	await stubAuthed({ userId: "u1" }, async () => {
		const { resp } = await runServerRequest(
			"POST",
			"/api/auth/vault/delete",
			{},
		);
		assertResponse(resp, 400, { error: "missing vaultId" });
	});
});

Deno.test(async function vaultDeleteRejectsNonOwner() {
	await stubAuthed({ userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "member",
					addedAt: "2026-01-01",
				});
				const { resp } = await runServerRequest(
					"POST",
					"/api/auth/vault/delete",
					{ vaultId: "v1" },
				);
				assertResponse(resp, 403, { error: "not owner" });
			},
		});
	});
});

Deno.test(async function vaultDeleteRejectsLastVault() {
	await stubAuthed({ userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "owner",
					addedAt: "2026-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "getVaultsByUser",
					action: async (vstub) => {
						vstub.resolves([
							{ id: "v1", name: "Only", createdAt: "2026-01-01" },
						]);
						const { resp } = await runServerRequest(
							"POST",
							"/api/auth/vault/delete",
							{ vaultId: "v1" },
						);
						assertResponse(resp, 400, { error: "last_vault" });
					},
				});
			},
		});
	});
});

Deno.test(async function vaultDeleteSucceedsWhenAnotherVaultRemains() {
	await stubAuthed({ userId: "u1" }, async () => {
		await withSpying({
			object: authMembershipInternals,
			method: "getMembership",
			action: async (mstub) => {
				mstub.resolves({
					userId: "u1",
					vaultId: "v1",
					role: "owner",
					addedAt: "2026-01-01",
				});
				await withSpying({
					object: authMembershipInternals,
					method: "getVaultsByUser",
					action: async (vstub) => {
						vstub.resolves([
							{ id: "v1", name: "First", createdAt: "2026-01-01" },
							{ id: "v2", name: "Second", createdAt: "2026-01-02" },
						]);
						await withSpying({
							object: authMembershipInternals,
							method: "deleteVault",
							action: async (dstub) => {
								dstub.resolves(undefined);
								const { resp } = await runServerRequest(
									"POST",
									"/api/auth/vault/delete",
									{ vaultId: "v1" },
								);
								assertResponse(resp, 200, { deleted: true });
								assert.assertEquals(dstub.callCount, 1);
							},
						});
					},
				});
			},
		});
	});
});
