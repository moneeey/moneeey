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
	private writeConn: SqliteConn | null = null;
	private readConn: SqliteConn | null = null;

	constructor(config: EngineConfig = {}) {
		this.path = config.sqlitePath ?? MONEEEY_SQLITE_PATH;
	}

	async withConn<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T> {
		const conn = await this.ensureWrite();
		return await conn.exclusive(fn);
	}

	async withRead<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T> {
		return await fn(await this.ensureRead());
	}

	closeAll(): void {
		for (const conn of [this.writeConn, this.readConn]) {
			if (!conn) continue;
			try {
				conn.close();
			} catch (err) {
				logger.warn("failed to close sqlite handle on shutdown", { err });
			}
		}
		this.writeConn = null;
		this.readConn = null;
	}

	private async ensureWrite(): Promise<SqliteConn> {
		if (this.writeConn) return this.writeConn;
		await ensureDir(this.path);
		const db = openSqlite(this.path);
		runMigrations(db, MIGRATIONS);
		this.writeConn = new SqliteConn(db);
		return this.writeConn;
	}

	private async ensureRead(): Promise<SqliteConn> {
		if (this.readConn) return this.readConn;
		await this.ensureWrite();
		this.readConn = new SqliteConn(openSqlite(this.path));
		return this.readConn;
	}
}
