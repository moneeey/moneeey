import type { Storage } from "../db/storage.ts";
import { Logger } from "../logger.ts";
import { generateVaultId } from "./ids.ts";
import type { Membership, VaultRecord } from "./types.ts";

const logger = Logger("data/vaults");

const VAULT_ID_ATTEMPTS = 5;
export const MAX_USERS_PER_VAULT = 10;
export const DEFAULT_VAULT_NAME = "My vault";

export class VaultFullError extends Error {
	constructor() {
		super("vault_full");
		this.name = "VaultFullError";
	}
}

export function defaultVaultNameFor(displayName: string): string {
	const trimmed = displayName.trim();
	return trimmed.length === 0 ? DEFAULT_VAULT_NAME : `${trimmed}'s vault`;
}

type VaultRow = { id: string; name: string; created_at: string };
type MembershipRow = {
	user_id: string;
	vault_id: string;
	role: "owner" | "member";
	added_at: string;
};

const toVault = (row: VaultRow): VaultRecord => ({
	id: row.id,
	name: row.name,
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
	name: string,
): Promise<VaultRecord> {
	const safeName = name.trim().length === 0 ? DEFAULT_VAULT_NAME : name.trim();
	for (let attempt = 1; attempt <= VAULT_ID_ATTEMPTS; attempt++) {
		const id = generateVaultId();
		const createdAt = new Date().toISOString();
		let inserted = true;
		try {
			await storage.withMeta((conn) =>
				conn.transaction(async (tx) => {
					await tx.run(
						"INSERT INTO vaults (id, name, created_at) VALUES (?, ?, ?)",
						id,
						safeName,
						createdAt,
					);
					await tx.run(
						"INSERT INTO user_vaults (user_id, vault_id, role, added_at) VALUES (?, ?, 'owner', ?)",
						userId,
						id,
						createdAt,
					);
				}),
			);
		} catch (err) {
			const msg = (err as Error).message ?? "";
			if (!msg.includes("UNIQUE")) throw err;
			inserted = false;
		}
		if (!inserted) {
			logger.warn("vault id collision, retrying", { id, attempt });
			continue;
		}
		return { id, name: safeName, createdAt };
	}
	throw new Error("failed to allocate vault id after retries");
}

export async function renameVault(
	storage: Storage,
	vaultId: string,
	name: string,
): Promise<void> {
	const safeName = name.trim();
	if (safeName.length === 0) throw new Error("vault_name_empty");
	await storage.withMeta(async (conn) => {
		const changes = await conn.run(
			"UPDATE vaults SET name = ? WHERE id = ?",
			safeName,
			vaultId,
		);
		if (changes === 0) throw new Error("vault_not_found");
	});
}

export async function getVaultsByUser(
	storage: Storage,
	userId: string,
): Promise<VaultRecord[]> {
	return await storage.withMeta(async (conn) => {
		const rows = await conn.query<VaultRow>(
			`SELECT v.id AS id, v.name AS name, v.created_at AS created_at
				 FROM vaults v
				 INNER JOIN user_vaults uv ON uv.vault_id = v.id
				 WHERE uv.user_id = ?
				 ORDER BY v.created_at`,
			userId,
		);
		return rows.map(toVault);
	});
}

export async function countMembers(
	storage: Storage,
	vaultId: string,
): Promise<number> {
	return await storage.withMeta(async (conn) => {
		const row = await conn.get<{ n: number }>(
			"SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?",
			vaultId,
		);
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
	await storage.withMeta((conn) =>
		conn.transaction(async (tx) => {
			const existing = await tx.get<{ one: number }>(
				"SELECT 1 AS one FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				userId,
				vaultId,
			);
			if (existing) {
				return;
			}
			const count = await tx.get<{ n: number }>(
				"SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?",
				vaultId,
			);
			if ((count?.n ?? 0) >= MAX_USERS_PER_VAULT) {
				throw new VaultFullError();
			}
			await tx.run(
				"INSERT INTO user_vaults (user_id, vault_id, role, added_at) VALUES (?, ?, ?, ?)",
				userId,
				vaultId,
				role,
				addedAt,
			);
		}),
	);
}

export async function getMembership(
	storage: Storage,
	userId: string,
	vaultId: string,
): Promise<Membership | null> {
	return await storage.withMeta(async (conn) => {
		const row = await conn.get<MembershipRow>(
			"SELECT user_id, vault_id, role, added_at FROM user_vaults WHERE user_id = ? AND vault_id = ?",
			userId,
			vaultId,
		);
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

export type VaultMember = Membership & { displayName: string };

export async function listVaultMembers(
	storage: Storage,
	vaultId: string,
): Promise<VaultMember[]> {
	return await storage.withMeta(async (conn) => {
		const rows = await conn.query<MembershipRow & { display_name: string }>(
			`SELECT uv.user_id AS user_id, uv.vault_id AS vault_id, uv.role AS role,
				        uv.added_at AS added_at, u.display_name AS display_name
				 FROM user_vaults uv
				 INNER JOIN users u ON u.id = uv.user_id
				 WHERE uv.vault_id = ?
				 ORDER BY CASE uv.role WHEN 'owner' THEN 0 ELSE 1 END, uv.added_at`,
			vaultId,
		);
		return rows.map((row) => ({
			...toMembership(row),
			displayName: row.display_name,
		}));
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
	await storage.withMeta(async (conn) => {
		const row = await conn.get<{ role: string }>(
			"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
			userId,
			vaultId,
		);
		if (!row) return;
		if (row.role === "owner") throw new CannotRemoveOwnerError();
		await conn.run(
			"DELETE FROM user_vaults WHERE user_id = ? AND vault_id = ?",
			userId,
			vaultId,
		);
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
	await storage.withMeta((conn) =>
		conn.transaction(async (tx) => {
			const from = await tx.get<{ role: string }>(
				"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				fromUserId,
				vaultId,
			);
			if (!from || from.role !== "owner") {
				throw new NotOwnerError();
			}
			const to = await tx.get<{ role: string }>(
				"SELECT role FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				toUserId,
				vaultId,
			);
			if (!to) {
				throw new TargetNotMemberError();
			}
			await tx.run(
				"UPDATE user_vaults SET role = 'member' WHERE user_id = ? AND vault_id = ?",
				fromUserId,
				vaultId,
			);
			await tx.run(
				"UPDATE user_vaults SET role = 'owner' WHERE user_id = ? AND vault_id = ?",
				toUserId,
				vaultId,
			);
		}),
	);
}

export async function deleteVault(
	storage: Storage,
	vaultId: string,
): Promise<void> {
	await storage.withMeta((conn) =>
		conn.transaction(async (tx) => {
			await tx.run("DELETE FROM vaults WHERE id = ?", vaultId);
		}),
	);
	await storage.deleteVaultStore(vaultId);
}
