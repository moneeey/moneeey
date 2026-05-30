import {
	MONEEEY_MAX_VAULT_HANDLES,
	MONEEEY_META_PATH,
	MONEEEY_VAULTS_DIR,
} from "../config.ts";
import { Logger } from "../logger.ts";
import type { EngineConfig, StorageEngine } from "./engine.ts";
import {
	META_MIGRATIONS,
	VAULT_MIGRATIONS,
	runMigrations,
} from "./migrations.ts";
import type { SqlConn } from "./sql.ts";
import { SqliteConn } from "./sqlite_conn.ts";
import { ensureDir, openSqlite } from "./sqlite_util.ts";

const DEFAULT_MAX_CACHED_HANDLES = MONEEEY_MAX_VAULT_HANDLES;

const logger = Logger("db/sqlite-per-vault");

export class SqlitePerVaultEngine implements StorageEngine {
	private metaPath: string;
	private vaultsDir: string;
	private maxCached: number;
	private metaConn: SqliteConn | null = null;
	private vaultConns = new Map<string, SqliteConn>();

	constructor(config: EngineConfig = {}) {
		this.metaPath = config.metaPath ?? MONEEEY_META_PATH;
		this.vaultsDir = config.vaultsDir ?? MONEEEY_VAULTS_DIR;
		this.maxCached = config.maxCachedHandles ?? DEFAULT_MAX_CACHED_HANDLES;
	}

	vaultPath(id: string): string {
		if (id.length < 4) {
			throw new Error(`vault id too short: ${id}`);
		}
		return `${this.vaultsDir}/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.sqlite`;
	}

	async withMeta<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T> {
		const conn = await this.ensureMeta();
		return await conn.exclusive(fn);
	}

	async withVault<T>(
		vaultId: string,
		fn: (conn: SqlConn) => Promise<T>,
	): Promise<T> {
		const conn = await this.openVault(vaultId);
		return await conn.exclusive(fn);
	}

	async createVaultStore(vaultId: string): Promise<void> {
		await this.openVault(vaultId);
	}

	async deleteVaultStore(vaultId: string): Promise<void> {
		const cached = this.vaultConns.get(vaultId);
		if (cached) {
			this.vaultConns.delete(vaultId);
			try {
				cached.close();
			} catch (err) {
				logger.warn("failed to close vault handle on delete", { vaultId, err });
			}
		}
		const path = this.vaultPath(vaultId);
		for (const sidecar of [path, `${path}-wal`, `${path}-shm`]) {
			try {
				await Deno.remove(sidecar);
			} catch {
				/* missing sidecar is fine */
			}
		}
	}

	cachedVaultCount(): number {
		return this.vaultConns.size;
	}

	closeAll(): void {
		for (const [, conn] of this.vaultConns) {
			try {
				conn.close();
			} catch (err) {
				logger.warn("failed to close vault handle on shutdown", { err });
			}
		}
		this.vaultConns.clear();
		if (this.metaConn) {
			try {
				this.metaConn.close();
			} catch (err) {
				logger.warn("failed to close meta handle on shutdown", { err });
			}
			this.metaConn = null;
		}
	}

	private async ensureMeta(): Promise<SqliteConn> {
		if (this.metaConn) return this.metaConn;
		await ensureDir(this.metaPath);
		const db = openSqlite(this.metaPath);
		runMigrations(db, META_MIGRATIONS);
		this.metaConn = new SqliteConn(db);
		return this.metaConn;
	}

	private async openVault(vaultId: string): Promise<SqliteConn> {
		const cached = this.vaultConns.get(vaultId);
		if (cached) {
			this.vaultConns.delete(vaultId);
			this.vaultConns.set(vaultId, cached);
			return cached;
		}
		const path = this.vaultPath(vaultId);
		await ensureDir(path);
		const db = openSqlite(path);
		runMigrations(db, VAULT_MIGRATIONS);
		const conn = new SqliteConn(db);
		this.vaultConns.set(vaultId, conn);
		this.evictIdle();
		return conn;
	}

	private evictIdle(): void {
		while (this.vaultConns.size > this.maxCached) {
			let evicted = false;
			for (const [key, conn] of this.vaultConns) {
				if (conn.inUse > 0) continue;
				this.vaultConns.delete(key);
				try {
					conn.close();
				} catch (err) {
					logger.warn("failed to close evicted vault handle", {
						vaultId: key,
						err,
					});
				}
				evicted = true;
				break;
			}
			if (!evicted) return;
		}
	}
}
