import type { Database } from "../deps.ts";

export type Migration = { name: string; sql: string };

export const MIGRATIONS: Migration[] = [
	{
		name: "0001_init",
		sql: `
			CREATE TABLE users (
				id            TEXT PRIMARY KEY,
				display_name  TEXT NOT NULL,
				created_at    TEXT NOT NULL
			);

			CREATE TABLE passkeys (
				credential_id   TEXT PRIMARY KEY,
				user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				public_key      TEXT NOT NULL,
				counter         INTEGER NOT NULL DEFAULT 0,
				transports_json TEXT,
				created_at      TEXT NOT NULL
			);

			CREATE INDEX passkeys_user_idx ON passkeys(user_id);

			CREATE TABLE vaults (
				id            TEXT PRIMARY KEY,
				name          TEXT NOT NULL,
				created_at    TEXT NOT NULL
			);

			CREATE TABLE user_vaults (
				user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				vault_id      TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
				role          TEXT NOT NULL DEFAULT 'owner',
				added_at      TEXT NOT NULL,
				PRIMARY KEY (user_id, vault_id)
			);

			CREATE INDEX user_vaults_vault_idx ON user_vaults(vault_id);

			CREATE TABLE documents (
				vault_id      TEXT NOT NULL,
				id            TEXT NOT NULL,
				updated_at    TEXT NOT NULL,
				deleted_at    TEXT,
				data          TEXT NOT NULL,
				PRIMARY KEY (vault_id, id)
			);

			CREATE TABLE invites (
				vault_id      TEXT NOT NULL,
				token_hash    TEXT NOT NULL,
				owner_user_id TEXT NOT NULL,
				expires_at    TEXT NOT NULL,
				redeemed_by   TEXT,
				created_at    TEXT NOT NULL,
				PRIMARY KEY (vault_id, token_hash)
			);
		`,
	},
	{
		name: "0002_nullable_document_data",
		sql: `
			CREATE TABLE documents_new (
				vault_id      TEXT NOT NULL,
				id            TEXT NOT NULL,
				updated_at    TEXT NOT NULL,
				deleted_at    TEXT,
				data          TEXT,
				PRIMARY KEY (vault_id, id)
			);

			INSERT INTO documents_new (vault_id, id, updated_at, deleted_at, data)
			SELECT vault_id, id, updated_at, deleted_at, data FROM documents;

			DROP TABLE documents;
			ALTER TABLE documents_new RENAME TO documents;
		`,
	},
];

export function runMigrations(
	db: Database,
	migrations: Migration[],
): { applied: string[] } {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			name       TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`);
	const rows = db
		.prepare("SELECT name FROM schema_migrations")
		.all<{ name: string }>();
	const existing = new Set(rows.map((r: { name: string }) => r.name));
	const applied: string[] = [];
	const now = new Date().toISOString();
	const insertApplied = db.prepare(
		"INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
	);
	for (const m of migrations) {
		if (existing.has(m.name)) continue;
		db.exec("BEGIN");
		try {
			db.exec(m.sql);
			insertApplied.run(m.name, now);
			db.exec("COMMIT");
		} catch (err) {
			db.exec("ROLLBACK");
			throw err;
		}
		applied.push(m.name);
	}
	return { applied };
}
