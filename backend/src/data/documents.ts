import type { Storage } from "../db/storage.ts";

export type IncomingDoc = {
	id: string;
	updated: string;
	deleted: 0 | 1;
	data: string;
};

export type DocRecord = {
	id: string;
	seq: number;
	updated: string;
	deleted: 0 | 1;
	data: string;
};

export type UpsertResult =
	| { id: string; status: "accepted"; seq: number }
	| { id: string; status: "stale"; currentSeq: number };

export async function getSince(
	storage: Storage,
	vaultId: string,
	sinceSeq: number,
	limit: number,
): Promise<DocRecord[]> {
	return await storage.withVault(vaultId, (db) =>
		db
			.prepare(
				"SELECT id, seq, updated, deleted, data FROM documents WHERE seq > ? ORDER BY seq LIMIT ?",
			)
			.all<DocRecord>(sinceSeq, limit),
	);
}

export async function getHeadSeq(
	storage: Storage,
	vaultId: string,
): Promise<number> {
	return await storage.withVault(vaultId, (db) => {
		const row = db
			.prepare("SELECT MAX(seq) AS s FROM documents")
			.get<{ s: number | null }>();
		return row?.s ?? 0;
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
				"SELECT seq, updated FROM documents WHERE id = ?",
			);
			const upsert = db.prepare(
				`INSERT INTO documents (id, seq, updated, deleted, data) VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET seq = excluded.seq, updated = excluded.updated, deleted = excluded.deleted, data = excluded.data`,
			);
			const headRow = db
				.prepare("SELECT MAX(seq) AS s FROM documents")
				.get<{ s: number | null }>();
			let nextSeq = (headRow?.s ?? 0) + 1;
			for (const incoming of docs) {
				const stored = getStored.get<{ seq: number; updated: string }>(
					incoming.id,
				);
				if (stored && stored.updated > incoming.updated) {
					results.push({
						id: incoming.id,
						status: "stale",
						currentSeq: stored.seq,
					});
					continue;
				}
				upsert.run(
					incoming.id,
					nextSeq,
					incoming.updated,
					incoming.deleted,
					incoming.data,
				);
				results.push({ id: incoming.id, status: "accepted", seq: nextSeq });
				nextSeq += 1;
			}
			db.exec("COMMIT");
			return results;
		} catch (err) {
			db.exec("ROLLBACK");
			throw err;
		}
	});
}
