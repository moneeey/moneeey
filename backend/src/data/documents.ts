import type { Storage } from "../db/storage.ts";

export type IncomingDoc = {
	id: string;
	updated_at: string;
	deleted_at: string | null;
	data: string;
};

export type DocRecord = {
	id: string;
	updated_at: string;
	deleted_at: string | null;
	data: string;
};

export type ManifestEntry = {
	id: string;
	updated_at: string;
};

export type UpsertResult =
	| { id: string; status: "accepted" }
	| { id: string; status: "stale"; current_updated_at: string };

type DocRow = {
	id: string;
	updated_at: string;
	deleted_at: string | null;
	data: string;
};

const toRecord = (row: DocRow): DocRecord => ({
	id: row.id,
	updated_at: row.updated_at,
	deleted_at: row.deleted_at,
	data: row.data,
});

export async function getManifest(
	storage: Storage,
	vaultId: string,
): Promise<ManifestEntry[]> {
	return await storage.withVault(vaultId, (db) =>
		db
			.prepare("SELECT id, updated_at FROM documents")
			.all<ManifestEntry>()
			.map((row: ManifestEntry) => ({
				id: row.id,
				updated_at: row.updated_at,
			})),
	);
}

export async function getDocs(
	storage: Storage,
	vaultId: string,
	ids: string[],
): Promise<DocRecord[]> {
	if (ids.length === 0) return [];
	return await storage.withVault(vaultId, (db) => {
		const placeholders = ids.map(() => "?").join(",");
		return db
			.prepare(
				`SELECT id, updated_at, deleted_at, data FROM documents WHERE id IN (${placeholders})`,
			)
			.all<DocRow>(...ids)
			.map(toRecord);
	});
}

export async function bulkUpsert(
	storage: Storage,
	vaultId: string,
	docs: IncomingDoc[],
): Promise<UpsertResult[]> {
	if (docs.length === 0) return [];
	return await storage.withVault(vaultId, (db) => {
		db.exec("BEGIN");
		try {
			const results: UpsertResult[] = [];
			const getStored = db.prepare(
				"SELECT updated_at FROM documents WHERE id = ?",
			);
			const upsert = db.prepare(
				`INSERT INTO documents (id, updated_at, deleted_at, data) VALUES (?, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, data = excluded.data`,
			);
			for (const incoming of docs) {
				const stored = getStored.get<{ updated_at: string }>(incoming.id);
				if (stored && stored.updated_at > incoming.updated_at) {
					results.push({
						id: incoming.id,
						status: "stale",
						current_updated_at: stored.updated_at,
					});
					continue;
				}
				upsert.run(
					incoming.id,
					incoming.updated_at,
					incoming.deleted_at,
					incoming.data,
				);
				results.push({ id: incoming.id, status: "accepted" });
			}
			db.exec("COMMIT");
			return results;
		} catch (err) {
			db.exec("ROLLBACK");
			throw err;
		}
	});
}
