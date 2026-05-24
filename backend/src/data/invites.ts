import type { Storage } from "../db/storage.ts";
import { sha384 } from "./ids.ts";
import type { InviteRecord } from "./types.ts";
import { MAX_USERS_PER_VAULT, VaultFullError } from "./vaults.ts";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_QUOTA_PER_OWNER = 5;

type InviteRow = {
	token_hash: string;
	vault_id: string;
	owner_user_id: string;
	expires_at: string;
	redeemed_by: string | null;
	created_at: string;
};

const toInvite = (row: InviteRow): InviteRecord => ({
	tokenHash: row.token_hash,
	vaultId: row.vault_id,
	ownerUserId: row.owner_user_id,
	expiresAt: row.expires_at,
	redeemedBy: row.redeemed_by,
	createdAt: row.created_at,
});

const randomToken = (): string => {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};

async function countActiveInvites(
	storage: Storage,
	ownerUserId: string,
	nowIso: string,
): Promise<number> {
	return await storage.withMeta((db) => {
		const row = db
			.prepare(
				`SELECT COUNT(*) AS n FROM invites
				 WHERE owner_user_id = ? AND redeemed_by IS NULL AND expires_at > ?`,
			)
			.get<{ n: number }>(ownerUserId, nowIso);
		return row?.n ?? 0;
	});
}

export async function createInvite(
	storage: Storage,
	ownerUserId: string,
	vaultId: string,
): Promise<string> {
	const now = Date.now();
	const nowIso = new Date(now).toISOString();
	const active = await countActiveInvites(storage, ownerUserId, nowIso);
	if (active >= INVITE_QUOTA_PER_OWNER) {
		throw new Error("invite_quota_exceeded");
	}
	const token = randomToken();
	const tokenHash = await sha384(token);
	const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
	await storage.withMeta((db) => {
		db.prepare(
			`INSERT INTO invites (token_hash, vault_id, owner_user_id, expires_at, redeemed_by, created_at)
			 VALUES (?, ?, ?, ?, NULL, ?)`,
		).run(tokenHash, vaultId, ownerUserId, expiresAt, nowIso);
	});
	return token;
}

export async function findInvite(
	storage: Storage,
	token: string,
): Promise<InviteRecord | null> {
	const tokenHash = await sha384(token);
	const invite = await storage.withMeta((db) => {
		const row = db
			.prepare(
				"SELECT token_hash, vault_id, owner_user_id, expires_at, redeemed_by, created_at FROM invites WHERE token_hash = ?",
			)
			.get<InviteRow>(tokenHash);
		return row ? toInvite(row) : null;
	});
	if (!invite) return null;
	if (invite.redeemedBy) return null;
	if (new Date(invite.expiresAt).getTime() <= Date.now()) return null;
	return invite;
}

export async function redeemInvite(
	storage: Storage,
	token: string,
	redeemerUserId: string,
): Promise<string> {
	const invite = await findInvite(storage, token);
	if (!invite) throw new Error("invite_not_found");
	await storage.withMeta((db) => {
		db.exec("BEGIN");
		try {
			const alreadyMember = db
				.prepare(
					"SELECT 1 AS one FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				)
				.get<{ one: number }>(redeemerUserId, invite.vaultId);
			if (!alreadyMember) {
				const count = db
					.prepare("SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?")
					.get<{ n: number }>(invite.vaultId);
				if ((count?.n ?? 0) >= MAX_USERS_PER_VAULT) {
					db.exec("ROLLBACK");
					throw new VaultFullError();
				}
			}
			const changes = db
				.prepare(
					"UPDATE invites SET redeemed_by = ? WHERE token_hash = ? AND redeemed_by IS NULL",
				)
				.run(redeemerUserId, invite.tokenHash);
			if (changes === 0) {
				db.exec("ROLLBACK");
				throw new Error("invite_already_redeemed");
			}
			db.prepare(
				"INSERT OR IGNORE INTO user_vaults (user_id, vault_id, role, added_at) VALUES (?, ?, 'member', ?)",
			).run(redeemerUserId, invite.vaultId, new Date().toISOString());
			db.exec("COMMIT");
		} catch (err) {
			if (
				!(err instanceof VaultFullError) &&
				(err as Error).message !== "invite_already_redeemed"
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
	return invite.vaultId;
}
