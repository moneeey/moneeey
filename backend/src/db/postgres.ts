import { MONEEEY_PG_POOL_SIZE, MONEEEY_PG_URL } from "../config.ts";
import { PgPool, type PgPoolClient } from "../deps.ts";
import { Logger } from "../logger.ts";
import type { EngineConfig, StorageEngine } from "./engine.ts";
import { MIGRATIONS, type Migration } from "./migrations.ts";
import type { SqlConn } from "./sql.ts";

const logger = Logger("db/postgres");

class PgConn implements SqlConn {
	constructor(private readonly client: PgPoolClient) {}

	private rewrite(sql: string): string {
		let i = 0;
		return sql.replace(/\?/g, () => `$${++i}`);
	}

	private normalize<T>(rows: T[]): T[] {
		for (const row of rows) {
			const obj = row as Record<string, unknown>;
			for (const key in obj) {
				if (typeof obj[key] === "bigint") obj[key] = Number(obj[key]);
			}
		}
		return rows;
	}

	async query<T>(sql: string, ...params: unknown[]): Promise<T[]> {
		const result = await this.client.queryObject<Record<string, unknown>>({
			text: this.rewrite(sql),
			args: params,
		});
		return this.normalize(result.rows as T[]);
	}

	async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
		const rows = await this.query<T>(sql, ...params);
		return rows[0];
	}

	async run(sql: string, ...params: unknown[]): Promise<number> {
		const result = await this.client.queryObject({
			text: this.rewrite(sql),
			args: params,
		});
		return result.rowCount ?? 0;
	}

	async exec(sql: string): Promise<void> {
		await this.client.queryArray(sql);
	}

	async transaction<T>(fn: (tx: SqlConn) => Promise<T>): Promise<T> {
		await this.client.queryArray("BEGIN");
		try {
			const result = await fn(this);
			await this.client.queryArray("COMMIT");
			return result;
		} catch (err) {
			try {
				await this.client.queryArray("ROLLBACK");
			} catch {
				/* already rolled back */
			}
			throw err;
		}
	}
}

const splitStatements = (sql: string): string[] =>
	sql
		.split(";")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

async function runPgMigrations(
	client: PgPoolClient,
	migrations: Migration[],
	now: string,
): Promise<void> {
	await client.queryArray(
		"CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
	);
	const rows = (
		await client.queryObject<{ name: string }>(
			"SELECT name FROM schema_migrations",
		)
	).rows;
	const existing = new Set(rows.map((r) => r.name));
	for (const migration of migrations) {
		if (existing.has(migration.name)) continue;
		await client.queryArray("BEGIN");
		try {
			for (const stmt of splitStatements(migration.sql)) {
				await client.queryArray(stmt);
			}
			await client.queryObject({
				text: "INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)",
				args: [migration.name, now],
			});
			await client.queryArray("COMMIT");
		} catch (err) {
			await client.queryArray("ROLLBACK");
			throw err;
		}
	}
}

export class PostgresEngine implements StorageEngine {
	private url: string;
	private size: number;
	private pool: PgPool | null = null;
	private init: Promise<PgPool> | null = null;

	constructor(config: EngineConfig = {}) {
		this.url = config.pgUrl ?? MONEEEY_PG_URL;
		this.size = MONEEEY_PG_POOL_SIZE;
		if (!this.url) {
			throw new Error("MONEEEY_PG_URL is required for the postgres engine");
		}
	}

	private ensure(): Promise<PgPool> {
		if (!this.init) {
			this.init = this.open().catch((err) => {
				this.init = null;
				throw err;
			});
		}
		return this.init;
	}

	private async open(): Promise<PgPool> {
		const pool = new PgPool(this.url, this.size, true);
		const client = await pool.connect();
		try {
			await runPgMigrations(client, MIGRATIONS, new Date().toISOString());
		} finally {
			client.release();
		}
		this.pool = pool;
		logger.info("postgres engine ready", { poolSize: this.size });
		return pool;
	}

	async withConn<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T> {
		const pool = await this.ensure();
		const client = await pool.connect();
		try {
			return await fn(new PgConn(client));
		} finally {
			client.release();
		}
	}

	async deleteVaultStore(vaultId: string): Promise<void> {
		await this.withConn((conn) =>
			conn.transaction(async (tx) => {
				await tx.run("DELETE FROM documents WHERE vault_id = ?", vaultId);
				await tx.run("DELETE FROM invites WHERE vault_id = ?", vaultId);
			}),
		);
	}

	closeAll(): void {
		if (this.pool) {
			this.pool.end().catch((err) => logger.warn("pool end failed", { err }));
			this.pool = null;
			this.init = null;
		}
	}
}
