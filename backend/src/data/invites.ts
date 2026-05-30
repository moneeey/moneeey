import type { Storage } from "../db/engine.ts";
import { randomTokenHex, sha384 } from "./ids.ts";
import type { InviteRecord } from "./types.ts";
import { MAX_USERS_PER_VAULT, VaultFullError } from "./vaults.ts";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_QUOTA_PER_OWNER = 5;

const TOKEN_SEPARATOR = ".";

type InviteRow = {
	token_hash: string;
	owner_user_id: string;
	expires_at: string;
	redeemed_by: string | null;
	created_at: string;
};

const toInvite = (row: InviteRow, vaultId: string): InviteRecord => ({
	tokenHash: row.token_hash,
	vaultId,
	ownerUserId: row.owner_user_id,
	expiresAt: row.expires_at,
	redeemedBy: row.redeemed_by,
	createdAt: row.created_at,
});

function parseToken(token: string): { vaultId: string; secret: string } | null {
	const sep = token.indexOf(TOKEN_SEPARATOR);
	if (sep <= 0 || sep === token.length - 1) return null;
	return { vaultId: token.slice(0, sep), secret: token.slice(sep + 1) };
}

async function countActiveInvites(
	storage: Storage,
	vaultId: string,
	ownerUserId: string,
	nowIso: string,
): Promise<number> {
	return await storage.withRead(async (conn) => {
		const row = await conn.get<{ n: number }>(
			`SELECT COUNT(*) AS n FROM invites
				 WHERE vault_id = ? AND owner_user_id = ? AND redeemed_by IS NULL AND expires_at > ?`,
			vaultId,
			ownerUserId,
			nowIso,
		);
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
	const active = await countActiveInvites(
		storage,
		vaultId,
		ownerUserId,
		nowIso,
	);
	if (active >= INVITE_QUOTA_PER_OWNER) {
		throw new Error("invite_quota_exceeded");
	}
	const secret = randomTokenHex();
	const token = `${vaultId}${TOKEN_SEPARATOR}${secret}`;
	const tokenHash = await sha384(token);
	const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
	await storage.withConn(async (conn) => {
		await conn.run(
			`INSERT INTO invites (vault_id, token_hash, owner_user_id, expires_at, redeemed_by, created_at)
			 VALUES (?, ?, ?, ?, NULL, ?)`,
			vaultId,
			tokenHash,
			ownerUserId,
			expiresAt,
			nowIso,
		);
	});
	return token;
}

export async function findInvite(
	storage: Storage,
	token: string,
): Promise<InviteRecord | null> {
	const parsed = parseToken(token);
	if (!parsed) return null;
	const tokenHash = await sha384(token);
	const invite = await storage.withRead(async (conn) => {
		const row = await conn.get<InviteRow>(
			"SELECT token_hash, owner_user_id, expires_at, redeemed_by, created_at FROM invites WHERE vault_id = ? AND token_hash = ?",
			parsed.vaultId,
			tokenHash,
		);
		return row ? toInvite(row, parsed.vaultId) : null;
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
	const { vaultId, tokenHash } = invite;
	return await storage.withConn((conn) =>
		conn.transaction(async (tx) => {
			const wasAlreadyMember = !!(await tx.get<{ one: number }>(
				"SELECT 1 AS one FROM user_vaults WHERE user_id = ? AND vault_id = ?",
				redeemerUserId,
				vaultId,
			));
			if (!wasAlreadyMember) {
				const count = await tx.get<{ n: number }>(
					"SELECT COUNT(*) AS n FROM user_vaults WHERE vault_id = ?",
					vaultId,
				);
				if ((count?.n ?? 0) >= MAX_USERS_PER_VAULT) {
					throw new VaultFullError();
				}
			}
			const changes = await tx.run(
				"UPDATE invites SET redeemed_by = ? WHERE vault_id = ? AND token_hash = ? AND redeemed_by IS NULL",
				redeemerUserId,
				vaultId,
				tokenHash,
			);
			if (changes === 0) throw new Error("invite_already_redeemed");
			if (!wasAlreadyMember) {
				await tx.run(
					"INSERT INTO user_vaults (user_id, vault_id, role, added_at) VALUES (?, ?, 'member', ?) ON CONFLICT DO NOTHING",
					redeemerUserId,
					vaultId,
					new Date().toISOString(),
				);
			}
			return vaultId;
		}),
	);
}
