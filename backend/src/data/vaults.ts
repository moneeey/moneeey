import type { Storage } from "../db/storage.ts";
import { fs } from "../deps.ts";
import { Logger } from "../logger.ts";
import { generateVaultId } from "./ids.ts";
import type { Membership, VaultRecord } from "./types.ts";

const logger = Logger("data/vaults");

const VAULT_ID_ATTEMPTS = 5;
export const MAX_USERS_PER_VAULT = 10;

export class VaultFullError extends Error {
	constructor() {
		super("vault_full");
		this.name = "VaultFullError";
	}
}

type VaultRow = { id: string; created_at: string };
type MembershipRow = {
	user_id: string;
	vault_id: string;
	role: "owner" | "member";
	added_at: string;
};

const toVault = (row: VaultRow): VaultRecord => ({
	id: row.id,
	createdAt: row.created_at,
});

const toMembership = (row: MembershipRow): Membership => ({
	userId: row.user_id,
	vaultId: row.vault_id,
	role: row.role,
	addedAt: row.added_at,
});

export async function createVaultForUser(
	storage: Storage,
	userId: string,
): Promise<VaultRecord> {
	for (let attempt = 1; attempt <= VAULT_ID_ATTEMPTS; attempt++) {
		const id = generateVaultId();
		const createdAt = new Date().toISOString();
		const inserted = await storage.withMeta((db) => {
			try {
				db.exec("BEGIN");
				db.prepare("INSERT INTO vaults (id, created_at) VALUES (?, ?)").run(
					id,
					createdAt,
				);
				db.prepare(
					"INSERT INTO user_vaults (user_id, vault_id, role, added_at) VALUES (?, ?, 'owner', ?)",
				).run(userId, id, createdAt);
				db.exec("COMMIT");
				return true;
			} catch (err) {
				db.exec("ROLLBACK");
				const msg = (err as Error).message ?? "";
				if (msg.includes("UNIQUE")) return false;
				throw err;
			}
		});
		if (!inserted) {
			logger.warn("vault id collision, retrying", { id, attempt });
			continue;
		}
		try {
			await storage.withVault(id, () => {});
		} catch (err) {
			logger.error("vault file creation failed, rolling back meta", {
				id,
				err,
			});
			await storage.withMeta((db) => {
				db.prepare("DELETE FROM vaults WHERE id = ?").run(id);
			});
			throw err;
		}
		return { id, createdAt };
	}
	throw new Error("failed to allocate vault id after retries");
}

export async function getVaultsByUser(
	storage: Storage,
	userId: string,
): Promise<VaultRecord[]> {
	return await storage.withMeta((db) => {
		const rows = db
			.prepare(
				`SELECT v.id AS id, v.created_at AS created_at
				 FROM vaults v
				 INNER JOIN user_vaults uv ON uv.vault_id = v.id
				 WHERE uv.user_id = ?
				 ORDER BY v.created_at`,
			)
			.all<VaultRow>(userId);
		return rows.map(toVault);
	});
}

export async function countMembers(
	storage: Storage,
	vaultId: string,
): Promise<number> {
	return await storage.withMeta((db) => {
		const row = db
			.prepare("SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?")
			.get<{ n: number }>(vaultId);
		return row?.n ?? 0;
	});
}

export async function addMember(
	storage: Storage,
	vaultId: string,
	userId: string,
	role: "owner" | "member" = "member",
): Promise<void> {
	const addedAt = new Date().toISOString();
	await storage.withMeta((db) => {
		db.exec("BEGIN");
		try {
			const existing = db
				.prepare(
					"SELECT 1 AS one FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				)
				.get<{ one: number }>(userId, vaultId);
			if (existing) {
				db.exec("COMMIT");
				return;
			}
			const count = db
				.prepare("SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?")
				.get<{ n: number }>(vaultId);
			if ((count?.n ?? 0) >= MAX_USERS_PER_VAULT) {
				db.exec("ROLLBACK");
				throw new VaultFullError();
			}
			db.prepare(
				"INSERT INTO user_vaults (user_id, vault_id, role, added_at) VALUES (?, ?, ?, ?)",
			).run(userId, vaultId, role, addedAt);
			db.exec("COMMIT");
		} catch (err) {
			if (!(err instanceof VaultFullError)) {
				db.exec("ROLLBACK");
			}
			throw err;
		}
	});
}

export async function getMembership(
	storage: Storage,
	userId: string,
	vaultId: string,
): Promise<Membership | null> {
	return await storage.withMeta((db) => {
		const row = db
			.prepare(
				"SELECT user_id, vault_id, role, added_at FROM user_vaults WHERE user_id = ? AND vault_id = ?",
			)
			.get<MembershipRow>(userId, vaultId);
		return row ? toMembership(row) : null;
	});
}

export async function userHasAccess(
	storage: Storage,
	userId: string,
	vaultId: string,
): Promise<boolean> {
	return (await getMembership(storage, userId, vaultId)) !== null;
}

export type VaultMember = Membership & { email: string };

export async function listVaultMembers(
	storage: Storage,
	vaultId: string,
): Promise<VaultMember[]> {
	return await storage.withMeta((db) => {
		const rows = db
			.prepare(
				`SELECT uv.user_id AS user_id, uv.vault_id AS vault_id, uv.role AS role,
				        uv.added_at AS added_at, u.email AS email
				 FROM user_vaults uv
				 INNER JOIN users u ON u.id = uv.user_id
				 WHERE uv.vault_id = ?
				 ORDER BY CASE uv.role WHEN 'owner' THEN 0 ELSE 1 END, uv.added_at`,
			)
			.all<MembershipRow & { email: string }>(vaultId);
		return rows.map((row) => ({ ...toMembership(row), email: row.email }));
	});
}

export class CannotRemoveOwnerError extends Error {
	constructor() {
		super("cannot_remove_owner");
		this.name = "CannotRemoveOwnerError";
	}
}

export async function removeMember(
	storage: Storage,
	vaultId: string,
	userId: string,
): Promise<void> {
	await storage.withMeta((db) => {
		const row = db
			.prepare(
				"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
			)
			.get<{ role: string }>(userId, vaultId);
		if (!row) return;
		if (row.role === "owner") throw new CannotRemoveOwnerError();
		db.prepare(
			"DELETE FROM user_vaults WHERE user_id = ? AND vault_id = ?",
		).run(userId, vaultId);
	});
}

export class NotOwnerError extends Error {
	constructor() {
		super("not_owner");
		this.name = "NotOwnerError";
	}
}

export class TargetNotMemberError extends Error {
	constructor() {
		super("target_not_member");
		this.name = "TargetNotMemberError";
	}
}

export async function transferOwnership(
	storage: Storage,
	vaultId: string,
	fromUserId: string,
	toUserId: string,
): Promise<void> {
	if (fromUserId === toUserId) return;
	await storage.withMeta((db) => {
		db.exec("BEGIN");
		try {
			const from = db
				.prepare(
					"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				)
				.get<{ role: string }>(fromUserId, vaultId);
			if (!from || from.role !== "owner") {
				db.exec("ROLLBACK");
				throw new NotOwnerError();
			}
			const to = db
				.prepare(
					"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				)
				.get<{ role: string }>(toUserId, vaultId);
			if (!to) {
				db.exec("ROLLBACK");
				throw new TargetNotMemberError();
			}
			db.prepare(
				"UPDATE user_vaults SET role = 'member' WHERE user_id = ? AND vault_id = ?",
			).run(fromUserId, vaultId);
			db.prepare(
				"UPDATE user_vaults SET role = 'owner' WHERE user_id = ? AND vault_id = ?",
			).run(toUserId, vaultId);
			db.exec("COMMIT");
		} catch (err) {
			if (
				!(err instanceof NotOwnerError) &&
				!(err instanceof TargetNotMemberError)
			) {
				try {
					db.exec("ROLLBACK");
				} catch {
					/* already rolled back */
				}
			}
			throw err;
		}
	});
}

export async function deleteVault(
	storage: Storage,
	vaultId: string,
): Promise<void> {
	await storage.withMeta((db) => {
		db.exec("BEGIN");
		try {
			db.prepare("DELETE FROM vaults WHERE id = ?").run(vaultId);
			db.exec("COMMIT");
		} catch (err) {
			db.exec("ROLLBACK");
			throw err;
		}
	});
	const path = storage.vaultPath(vaultId);
	for (const sidecar of [path, `${path}-wal`, `${path}-shm`]) {
		if (fs.existsSync(sidecar)) {
			try {
				Deno.removeSync(sidecar);
			} catch (err) {
				logger.warn("failed to unlink vault sidecar", { path: sidecar, err });
			}
		}
	}
}
