import { authenticateAndRespond } from "./auth_session.ts";
import { getStorage } from "./data/storage_singleton.ts";
import { getUserByEmail, getUserById } from "./data/users.ts";
import {
	CannotRemoveOwnerError,
	NotOwnerError,
	TargetNotMemberError,
	getMembership,
	getVaultsByUser,
	listVaultMembers,
	removeMember,
	transferOwnership,
} from "./data/vaults.ts";
import { oak } from "./deps.ts";
import { authJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";

const logger = Logger("auth_membership");

type AuthedUser = { email: string; userId: string };

async function readAuthed(ctx: oak.Context): Promise<AuthedUser | null> {
	const authToken = await ctx.cookies.get("authToken");
	if (!authToken) return null;
	try {
		const validated = await authJwt.validate(authToken);
		const email = validated.payload.sub || "";
		const userId = String(validated.payload.userId || "");
		if (!email || !userId) return null;
		return { email, userId };
	} catch {
		return null;
	}
}

function respond(ctx: oak.Context, status: oak.Status, body: object) {
	ctx.response.body = JSON.stringify(body);
	ctx.response.status = status;
}

async function getBodyJson(ctx: oak.Context): Promise<Record<string, unknown>> {
	try {
		const value = await ctx.request.body({ type: "json" }).value;
		return (value ?? {}) as Record<string, unknown>;
	} catch {
		return {};
	}
}

export const authMembershipInternals = {
	readAuthed,
	listVaultMembers,
	removeMember,
	transferOwnership,
	getMembership,
	getVaultsByUser,
	getUserByEmail,
	getUserById,
	authenticateAndRespond,
};

export function setupMembership(authRouter: oak.Router) {
	authRouter.post("/vaults/list", async (ctx) => {
		try {
			const authed = await authMembershipInternals.readAuthed(ctx);
			if (!authed) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}
			const storage = getStorage();
			const vaults = await authMembershipInternals.getVaultsByUser(
				storage,
				authed.userId,
			);
			const enriched = await Promise.all(
				vaults.map(async (v) => {
					const m = await authMembershipInternals.getMembership(
						storage,
						authed.userId,
						v.id,
					);
					return {
						vaultId: v.id,
						role: m?.role ?? "member",
						createdAt: v.createdAt,
					};
				}),
			);
			respond(ctx, oak.Status.OK, { vaults: enriched });
		} catch (err) {
			logger.error("vaults/list error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/vault/select", async (ctx) => {
		try {
			const authed = await authMembershipInternals.readAuthed(ctx);
			if (!authed) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(ctx);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			if (!vaultId) {
				respond(ctx, oak.Status.BadRequest, { error: "missing vaultId" });
				return;
			}
			const membership = await authMembershipInternals.getMembership(
				getStorage(),
				authed.userId,
				vaultId,
			);
			if (!membership) {
				respond(ctx, oak.Status.Forbidden, { error: "not a member" });
				return;
			}
			const result = await authMembershipInternals.authenticateAndRespond(
				ctx,
				"passkey",
				authed.email,
				authed.userId,
				vaultId,
			);
			respond(ctx, oak.Status.OK, result);
		} catch (err) {
			logger.error("vault/select error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/vault/members", async (ctx) => {
		try {
			const authed = await authMembershipInternals.readAuthed(ctx);
			if (!authed) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(ctx);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			if (!vaultId) {
				respond(ctx, oak.Status.BadRequest, { error: "missing vaultId" });
				return;
			}
			const storage = getStorage();
			const membership = await authMembershipInternals.getMembership(
				storage,
				authed.userId,
				vaultId,
			);
			if (!membership) {
				respond(ctx, oak.Status.Forbidden, { error: "not a member" });
				return;
			}
			const members = await authMembershipInternals.listVaultMembers(
				storage,
				vaultId,
			);
			respond(ctx, oak.Status.OK, {
				members: members.map((m) => ({
					userId: m.userId,
					email: m.email,
					role: m.role,
					addedAt: m.addedAt,
				})),
				yourRole: membership.role,
				yourUserId: authed.userId,
			});
		} catch (err) {
			logger.error("vault/members error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/vault/kick", async (ctx) => {
		try {
			const authed = await authMembershipInternals.readAuthed(ctx);
			if (!authed) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(ctx);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			const targetUserId = typeof body.userId === "string" ? body.userId : "";
			if (!vaultId || !targetUserId) {
				respond(ctx, oak.Status.BadRequest, {
					error: "missing vaultId or userId",
				});
				return;
			}
			const storage = getStorage();
			const caller = await authMembershipInternals.getMembership(
				storage,
				authed.userId,
				vaultId,
			);
			if (!caller || caller.role !== "owner") {
				respond(ctx, oak.Status.Forbidden, { error: "not owner" });
				return;
			}
			if (targetUserId === authed.userId) {
				respond(ctx, oak.Status.BadRequest, { error: "cannot kick self" });
				return;
			}
			try {
				await authMembershipInternals.removeMember(
					storage,
					vaultId,
					targetUserId,
				);
			} catch (err) {
				if (err instanceof CannotRemoveOwnerError) {
					respond(ctx, oak.Status.BadRequest, {
						error: "cannot_remove_owner",
					});
					return;
				}
				throw err;
			}
			respond(ctx, oak.Status.OK, { removed: true });
		} catch (err) {
			logger.error("vault/kick error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/vault/transfer", async (ctx) => {
		try {
			const authed = await authMembershipInternals.readAuthed(ctx);
			if (!authed) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(ctx);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			const targetUserId = typeof body.userId === "string" ? body.userId : "";
			if (!vaultId || !targetUserId) {
				respond(ctx, oak.Status.BadRequest, {
					error: "missing vaultId or userId",
				});
				return;
			}
			const storage = getStorage();
			try {
				await authMembershipInternals.transferOwnership(
					storage,
					vaultId,
					authed.userId,
					targetUserId,
				);
			} catch (err) {
				if (err instanceof NotOwnerError) {
					respond(ctx, oak.Status.Forbidden, { error: "not owner" });
					return;
				}
				if (err instanceof TargetNotMemberError) {
					respond(ctx, oak.Status.BadRequest, {
						error: "target_not_member",
					});
					return;
				}
				throw err;
			}
			respond(ctx, oak.Status.OK, { transferred: true });
		} catch (err) {
			logger.error("vault/transfer error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});
}
