import type { Storage } from "./db/storage.ts";
import { Logger } from "./logger.ts";
import { deleteVault } from "./data/vaults.ts";

const logger = Logger("janitor");

const TEST_EMAIL_SUFFIX = "@playwright.local";
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
	const users = await storage.withMeta((db) =>
		db
			.prepare(
				"SELECT id, email FROM users WHERE email LIKE ? AND created_at < ?",
			)
			.all<{ id: string; email: string }>(`%${TEST_EMAIL_SUFFIX}`, threshold),
	);
	let vaultsDeleted = 0;
	for (const user of users) {
		const ownedVaultIds = await storage.withMeta((db) =>
			db
				.prepare(
					`SELECT v.id AS id FROM vaults v
					 INNER JOIN user_vaults uv ON uv.vault_id = v.id
					 WHERE uv.user_id = ? AND uv.role = 'owner'`,
				)
				.all<{ id: string }>(user.id)
				.map((r: { id: string }) => r.id),
		);
		for (const vaultId of ownedVaultIds) {
			try {
				await deleteVault(storage, vaultId);
				vaultsDeleted += 1;
			} catch (err) {
				logger.warn("failed to delete stale vault", { vaultId, err });
			}
		}
		await storage.withMeta((db) => {
			db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
		});
	}
	if (users.length > 0) {
		logger.info("purged stale test users", {
			usersDeleted: users.length,
			vaultsDeleted,
		});
	}
	return { usersDeleted: users.length, vaultsDeleted };
}
