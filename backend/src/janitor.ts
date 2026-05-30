import { TEST_DISPLAY_NAME_PREFIX } from "./data/ids.ts";
import { deleteVault } from "./data/vaults.ts";
import type { Storage } from "./db/storage.ts";
import { Logger } from "./logger.ts";

const logger = Logger("janitor");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type PurgeResult = {
	usersDeleted: number;
	vaultsDeleted: number;
};

export async function purgeStaleTestUsers(
	storage: Storage,
	now: Date = new Date(),
): Promise<PurgeResult> {
	const threshold = new Date(now.getTime() - ONE_DAY_MS).toISOString();
	const users = await storage.withMeta((conn) =>
		conn.query<{ id: string; display_name: string }>(
			"SELECT id, display_name FROM users WHERE display_name LIKE ? AND created_at < ?",
			`${TEST_DISPLAY_NAME_PREFIX}%`,
			threshold,
		),
	);
	let vaultsDeleted = 0;
	for (const user of users) {
		const ownedVaultIds = await storage.withMeta(async (conn) => {
			const rows = await conn.query<{ id: string }>(
				`SELECT v.id AS id FROM vaults v
					 INNER JOIN user_vaults uv ON uv.vault_id = v.id
					 WHERE uv.user_id = ? AND uv.role = 'owner'`,
				user.id,
			);
			return rows.map((r) => r.id);
		});
		for (const vaultId of ownedVaultIds) {
			try {
				await deleteVault(storage, vaultId);
				vaultsDeleted += 1;
			} catch (err) {
				logger.warn("failed to delete stale vault", { vaultId, err });
			}
		}
		await storage.withMeta((conn) =>
			conn.run("DELETE FROM users WHERE id = ?", user.id),
		);
	}
	if (users.length > 0) {
		logger.info("purged stale test users", {
			usersDeleted: users.length,
			vaultsDeleted,
		});
	}
	return { usersDeleted: users.length, vaultsDeleted };
}
