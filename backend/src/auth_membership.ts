import type express from "express";
import { authenticateAndRespond } from "./auth_session.ts";
import { getStorage } from "./data/storage_singleton.ts";
import { getUserById } from "./data/users.ts";
import {
	CannotRemoveOwnerError,
	NotOwnerError,
	TargetNotMemberError,
	createVaultForUser,
	defaultVaultNameFor,
	deleteVault,
	getMembership,
	getVaultsByUser,
	listVaultMembers,
	removeMember,
	renameVault,
	transferOwnership,
} from "./data/vaults.ts";
import { authJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";

const logger = Logger("auth_membership");

type AuthedUser = { userId: string };

async function readAuthed(req: express.Request): Promise<AuthedUser | null> {
	const authToken = req.cookies.authToken;
	if (!authToken) return null;
	try {
		const validated = await authJwt.validate(authToken);
		const userId = String(validated.payload.userId || "");
		if (!userId) return null;
		return { userId };
	} catch {
		return null;
	}
}

function respond(res: express.Response, status: number, body: object) {
	res.status(status).json(body);
}

async function getBodyJson(
	req: express.Request,
): Promise<Record<string, unknown>> {
	return (req.body ?? {}) as Record<string, unknown>;
}

const MAX_VAULT_NAME_LENGTH = 64;

const parseVaultName = (raw: unknown): string | null => {
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	if (trimmed.length === 0) return null;
	if (trimmed.length > MAX_VAULT_NAME_LENGTH) return null;
	return trimmed;
};

export class LastVaultError extends Error {
	constructor() {
		super("last_vault");
		this.name = "LastVaultError";
	}
}

export const authMembershipInternals = {
	readAuthed,
	listVaultMembers,
	removeMember,
	transferOwnership,
	getMembership,
	getVaultsByUser,
	renameVault,
	createVaultForUser,
	deleteVault,
	getUserById,
	authenticateAndRespond,
};

export function setupMembership(authRouter: express.Router) {
	authRouter.post("/vaults/list", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
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
						name: v.name,
						role: m?.role ?? "member",
						createdAt: v.createdAt,
					};
				}),
			);
			respond(res, 200, { vaults: enriched });
		} catch (err) {
			logger.error("vaults/list error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/create", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const storage = getStorage();
			let name = parseVaultName(body.name);
			if (!name) {
				const user = await authMembershipInternals.getUserById(
					storage,
					authed.userId,
				);
				name = defaultVaultNameFor(user?.displayName ?? "");
			}
			const vault = await authMembershipInternals.createVaultForUser(
				storage,
				authed.userId,
				name,
			);
			respond(res, 200, {
				vaultId: vault.id,
				name: vault.name,
				createdAt: vault.createdAt,
			});
		} catch (err) {
			logger.error("vault/create error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/delete", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			if (!vaultId) {
				respond(res, 400, { error: "missing vaultId" });
				return;
			}
			const storage = getStorage();
			const membership = await authMembershipInternals.getMembership(
				storage,
				authed.userId,
				vaultId,
			);
			if (!membership || membership.role !== "owner") {
				respond(res, 403, { error: "not owner" });
				return;
			}
			const ownVaults = await authMembershipInternals.getVaultsByUser(
				storage,
				authed.userId,
			);
			if (ownVaults.length <= 1) {
				respond(res, 400, { error: "last_vault" });
				return;
			}
			await authMembershipInternals.deleteVault(storage, vaultId);
			respond(res, 200, { deleted: true });
		} catch (err) {
			logger.error("vault/delete error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/select", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			if (!vaultId) {
				respond(res, 400, { error: "missing vaultId" });
				return;
			}
			const membership = await authMembershipInternals.getMembership(
				getStorage(),
				authed.userId,
				vaultId,
			);
			if (!membership) {
				respond(res, 403, { error: "not a member" });
				return;
			}
			const result = await authMembershipInternals.authenticateAndRespond(
				res,
				"passkey",
				authed.userId,
				vaultId,
			);
			respond(res, 200, result);
		} catch (err) {
			logger.error("vault/select error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/rename", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			const rawName = typeof body.name === "string" ? body.name : "";
			if (!vaultId || rawName.trim().length === 0) {
				respond(res, 400, { error: "missing vaultId or name" });
				return;
			}
			const storage = getStorage();
			const caller = await authMembershipInternals.getMembership(
				storage,
				authed.userId,
				vaultId,
			);
			if (!caller || caller.role !== "owner") {
				respond(res, 403, { error: "not owner" });
				return;
			}
			await authMembershipInternals.renameVault(storage, vaultId, rawName);
			respond(res, 200, { renamed: true });
		} catch (err) {
			logger.error("vault/rename error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/members", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			if (!vaultId) {
				respond(res, 400, { error: "missing vaultId" });
				return;
			}
			const storage = getStorage();
			const membership = await authMembershipInternals.getMembership(
				storage,
				authed.userId,
				vaultId,
			);
			if (!membership) {
				respond(res, 403, { error: "not a member" });
				return;
			}
			const members = await authMembershipInternals.listVaultMembers(
				storage,
				vaultId,
			);
			respond(res, 200, {
				members: members.map((m) => ({
					userId: m.userId,
					displayName: m.displayName,
					role: m.role,
					addedAt: m.addedAt,
				})),
				yourRole: membership.role,
				yourUserId: authed.userId,
			});
		} catch (err) {
			logger.error("vault/members error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/kick", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			const targetUserId = typeof body.userId === "string" ? body.userId : "";
			if (!vaultId || !targetUserId) {
				respond(res, 400, { error: "missing vaultId or userId" });
				return;
			}
			const storage = getStorage();
			const caller = await authMembershipInternals.getMembership(
				storage,
				authed.userId,
				vaultId,
			);
			if (!caller || caller.role !== "owner") {
				respond(res, 403, { error: "not owner" });
				return;
			}
			if (targetUserId === authed.userId) {
				respond(res, 400, { error: "cannot kick self" });
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
					respond(res, 400, { error: "cannot_remove_owner" });
					return;
				}
				throw err;
			}
			respond(res, 200, { removed: true });
		} catch (err) {
			logger.error("vault/kick error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/vault/transfer", async (req, res) => {
		try {
			const authed = await authMembershipInternals.readAuthed(req);
			if (!authed) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const body = await getBodyJson(req);
			const vaultId = typeof body.vaultId === "string" ? body.vaultId : "";
			const targetUserId = typeof body.userId === "string" ? body.userId : "";
			if (!vaultId || !targetUserId) {
				respond(res, 400, { error: "missing vaultId or userId" });
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
					respond(res, 403, { error: "not owner" });
					return;
				}
				if (err instanceof TargetNotMemberError) {
					respond(res, 400, { error: "target_not_member" });
					return;
				}
				throw err;
			}
			respond(res, 200, { transferred: true });
		} catch (err) {
			logger.error("vault/transfer error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});
}
