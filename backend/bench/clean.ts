import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";
import { getStorage } from "../src/data/storage_singleton.ts";
import { deleteVault } from "../src/data/vaults.ts";

export const LOADTEST_PREFIX = "loadtest-";

export async function clean(prefix: string): Promise<void> {
	const storage = getStorage();
	const users = await storage.withMeta((conn) =>
		conn.query<{ id: string; display_name: string }>(
			"SELECT id, display_name FROM users WHERE display_name LIKE ?",
			`${prefix}%`,
		),
	);
	console.log(`found ${users.length} users matching '${prefix}%'`);
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
				vaultsDeleted++;
			} catch (err) {
				console.error(
					`failed to delete vault ${vaultId}: ${(err as Error).message}`,
				);
			}
		}
		await storage.withMeta((conn) =>
			conn.run("DELETE FROM users WHERE id = ?", user.id),
		);
	}
	console.log(`deleted ${users.length} users and ${vaultsDeleted} vaults`);
}

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["prefix"],
		default: { prefix: LOADTEST_PREFIX },
	});
	await clean(String(flags.prefix));
	getStorage().closeAll();
}
