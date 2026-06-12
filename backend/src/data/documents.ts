import type { Storage } from "../db/engine.ts";
import { metrics } from "../metrics.ts";

const observeDb = (op: string, start: number): void =>
	metrics.dbDuration.observe((performance.now() - start) / 1000, { op });

export type IncomingDoc = {
	id: string;
	updated_at: string;
	deleted_at: string | null;
	data: string | null;
};

export type DocRecord = {
	id: string;
	updated_at: string;
	deleted_at: string | null;
	data: string | null;
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
	data: string | null;
};

const isExpiredDeletion = (deletedAt: string | null, now: string): boolean =>
	deletedAt !== null && deletedAt <= now;

const purgeDoc = (doc: IncomingDoc, now: string): IncomingDoc =>
	isExpiredDeletion(doc.deleted_at, now)
		? { ...doc, updated_at: now, data: null }
		: doc;

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
	const start = performance.now();
	try {
		await purgeExpiredDocuments(storage, vaultId);
		return await storage.withRead((conn) =>
			conn.query<ManifestEntry>(
				"SELECT id, updated_at FROM documents WHERE vault_id = ?",
				vaultId,
			),
		);
	} finally {
		observeDb("manifest", start);
	}
}

export async function getDocs(
	storage: Storage,
	vaultId: string,
	ids: string[],
): Promise<DocRecord[]> {
	if (ids.length === 0) return [];
	const start = performance.now();
	try {
		await purgeExpiredDocuments(storage, vaultId);
		return await storage.withRead(async (conn) => {
			const placeholders = ids.map(() => "?").join(",");
			const rows = await conn.query<DocRow>(
				`SELECT id, updated_at, deleted_at, data FROM documents WHERE vault_id = ? AND id IN (${placeholders})`,
				vaultId,
				...ids,
			);
			return rows.map(toRecord);
		});
	} finally {
		observeDb("fetch", start);
	}
}

export async function bulkUpsert(
	storage: Storage,
	vaultId: string,
	docs: IncomingDoc[],
): Promise<UpsertResult[]> {
	if (docs.length === 0) return [];
	const start = performance.now();
	try {
		await purgeExpiredDocuments(storage, vaultId);
		const now = new Date().toISOString();
		const preparedDocs = docs.map((incoming) => purgeDoc(incoming, now));
		return await storage.withConn((conn) =>
			conn.transaction(async (tx) => {
				const results: UpsertResult[] = [];
				for (const incoming of preparedDocs) {
					const stored = await tx.get<{ updated_at: string }>(
						"SELECT updated_at FROM documents WHERE vault_id = ? AND id = ?",
						vaultId,
						incoming.id,
					);
					if (stored && stored.updated_at > incoming.updated_at) {
						results.push({
							id: incoming.id,
							status: "stale",
							current_updated_at: stored.updated_at,
						});
						continue;
					}
					await tx.run(
						`INSERT INTO documents (vault_id, id, updated_at, deleted_at, data) VALUES (?, ?, ?, ?, ?)
					 ON CONFLICT(vault_id, id) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, data = excluded.data`,
						vaultId,
						incoming.id,
						incoming.updated_at,
						incoming.deleted_at,
						incoming.data,
					);
					results.push({ id: incoming.id, status: "accepted" });
				}
				return results;
			}),
		);
	} finally {
		observeDb("push", start);
	}
}

export async function purgeExpiredDocuments(
	storage: Storage,
	vaultId: string,
): Promise<string[]> {
	const now = new Date().toISOString();
	const start = performance.now();
	try {
		return await storage.withConn((conn) =>
			conn.transaction(async (tx) => {
				const expired = await tx.query<{ id: string }>(
					"SELECT id FROM documents WHERE vault_id = ? AND deleted_at IS NOT NULL AND deleted_at <= ? AND data IS NOT NULL",
					vaultId,
					now,
				);
				if (expired.length === 0) return [];
				await tx.run(
					"UPDATE documents SET data = NULL, updated_at = ? WHERE vault_id = ? AND deleted_at IS NOT NULL AND deleted_at <= ? AND data IS NOT NULL",
					now,
					vaultId,
					now,
				);
				return expired.map((row) => row.id);
			}),
		);
	} finally {
		observeDb("purge", start);
	}
}
