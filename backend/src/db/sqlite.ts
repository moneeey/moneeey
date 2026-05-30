import { MONEEEY_SQLITE_PATH } from "../config.ts";
import { Logger } from "../logger.ts";
import type { EngineConfig, StorageEngine } from "./engine.ts";
import { MIGRATIONS, runMigrations } from "./migrations.ts";
import type { SqlConn } from "./sql.ts";
import { SqliteConn } from "./sqlite_conn.ts";
import { ensureDir, openSqlite } from "./sqlite_util.ts";

const logger = Logger("db/sqlite");

export class SqliteEngine implements StorageEngine {
	private path: string;
	private conn: SqliteConn | null = null;

	constructor(config: EngineConfig = {}) {
		this.path = config.sqlitePath ?? MONEEEY_SQLITE_PATH;
	}

	async withConn<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T> {
		const conn = await this.ensureConn();
		return await conn.exclusive(fn);
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
		if (this.conn) {
			try {
				this.conn.close();
			} catch (err) {
				logger.warn("failed to close sqlite handle on shutdown", { err });
			}
			this.conn = null;
		}
	}

	private async ensureConn(): Promise<SqliteConn> {
		if (this.conn) return this.conn;
		await ensureDir(this.path);
		const db = openSqlite(this.path);
		runMigrations(db, MIGRATIONS);
		this.conn = new SqliteConn(db);
		return this.conn;
	}
}
