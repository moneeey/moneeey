import type { Database } from "../deps.ts";

export type Migration = { name: string; sql: string };

export const META_MIGRATIONS: Migration[] = [
	{
		name: "0001_init",
		sql: `
			CREATE TABLE users (
				id            TEXT PRIMARY KEY,
				email         TEXT UNIQUE NOT NULL,
				credentials   TEXT NOT NULL DEFAULT '[]',
				is_test       INTEGER NOT NULL DEFAULT 0,
				created_at    TEXT NOT NULL
			);

			CREATE TABLE vaults (
				id            TEXT PRIMARY KEY,
				created_at    TEXT NOT NULL
			);

			CREATE TABLE user_vaults (
				user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				vault_id      TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
				role          TEXT NOT NULL DEFAULT 'owner',
				added_at      TEXT NOT NULL,
				PRIMARY KEY (user_id, vault_id)
			);

			CREATE TABLE invites (
				token_hash    TEXT PRIMARY KEY,
				vault_id      TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
				owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				expires_at    TEXT NOT NULL,
				redeemed_by   TEXT REFERENCES users(id),
				created_at    TEXT NOT NULL
			);
		`,
	},
];

export const VAULT_MIGRATIONS: Migration[] = [
	{
		name: "0001_init",
		sql: `
			CREATE TABLE documents (
				id            TEXT PRIMARY KEY,
				seq           INTEGER NOT NULL,
				updated       TEXT NOT NULL,
				deleted       INTEGER NOT NULL DEFAULT 0,
				data          TEXT NOT NULL
			);
			CREATE INDEX documents_pull_idx ON documents (seq);
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
