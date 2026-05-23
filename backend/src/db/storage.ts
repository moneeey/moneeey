import { MONEEEY_META_PATH, MONEEEY_VAULTS_DIR } from "../config.ts";
import { Database } from "../deps.ts";
import { Logger } from "../logger.ts";
import {
	META_MIGRATIONS,
	VAULT_MIGRATIONS,
	runMigrations,
} from "./migrations.ts";

const MAX_CACHED_HANDLES = 100;

const logger = Logger("storage");

export type StorageConfig = {
	metaPath?: string;
	vaultsDir?: string;
	maxCachedHandles?: number;
};

export class Storage {
	private metaPath: string;
	private vaultsDir: string;
	private maxCached: number;
	private metaHandle: Database | null = null;
	private vaultHandles = new Map<string, Database>();

	constructor(config: StorageConfig = {}) {
		this.metaPath = config.metaPath ?? MONEEEY_META_PATH;
		this.vaultsDir = config.vaultsDir ?? MONEEEY_VAULTS_DIR;
		this.maxCached = config.maxCachedHandles ?? MAX_CACHED_HANDLES;
	}

	getMetaPath(): string {
		return this.metaPath;
	}

	getVaultsDir(): string {
		return this.vaultsDir;
	}

	vaultPath(id: string): string {
		if (id.length < 4) {
			throw new Error(`vault id too short: ${id}`);
		}
		return `${this.vaultsDir}/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.sqlite`;
	}

	async withMeta<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
		const handle = await this.ensureMeta();
		return await fn(handle);
	}

	async withVault<T>(
		vaultId: string,
		fn: (db: Database) => T | Promise<T>,
	): Promise<T> {
		const handle = await this.openVault(vaultId);
		return await fn(handle);
	}

	private async ensureMeta(): Promise<Database> {
		if (this.metaHandle) return this.metaHandle;
		await ensureDir(this.metaPath);
		const db = openSqlite(this.metaPath);
		const { applied } = runMigrations(db, META_MIGRATIONS);
		if (applied.length === 0) {
			logger.info("meta: no new migrations", { path: this.metaPath });
		} else {
			logger.info("meta: applied migrations", {
				path: this.metaPath,
				applied,
			});
		}
		this.metaHandle = db;
		return db;
	}

	private async openVault(vaultId: string): Promise<Database> {
		const cached = this.vaultHandles.get(vaultId);
		if (cached) {
			this.vaultHandles.delete(vaultId);
			this.vaultHandles.set(vaultId, cached);
			return cached;
		}
		const path = this.vaultPath(vaultId);
		await ensureDir(path);
		const db = openSqlite(path);
		const { applied } = runMigrations(db, VAULT_MIGRATIONS);
		if (applied.length === 0) {
			logger.info("vault: no new migrations on open", { vaultId });
		} else {
			logger.info("vault: applied migrations on open", { vaultId, applied });
		}
		this.vaultHandles.set(vaultId, db);
		if (this.vaultHandles.size > this.maxCached) {
			const oldestEntry = this.vaultHandles.entries().next().value;
			if (oldestEntry) {
				const [oldestKey, oldestDb] = oldestEntry;
				this.vaultHandles.delete(oldestKey);
				try {
					oldestDb.close();
				} catch (err) {
					logger.warn("failed to close evicted vault handle", {
						vaultId: oldestKey,
						err,
					});
				}
			}
		}
		return db;
	}

	cachedVaultCount(): number {
		return this.vaultHandles.size;
	}

	closeAll(): void {
		for (const [, db] of this.vaultHandles) {
			try {
				db.close();
			} catch (err) {
				logger.warn("failed to close vault handle on shutdown", { err });
			}
		}
		this.vaultHandles.clear();
		if (this.metaHandle) {
			try {
				this.metaHandle.close();
			} catch (err) {
				logger.warn("failed to close meta handle on shutdown", { err });
			}
			this.metaHandle = null;
		}
	}
}

const ensureDir = async (filePath: string): Promise<void> => {
	const slash = filePath.lastIndexOf("/");
	if (slash <= 0) return;
	const dir = filePath.substring(0, slash);
	await Deno.mkdir(dir, { recursive: true });
};

const openSqlite = (path: string): Database => {
	const db = new Database(path);
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec("PRAGMA synchronous = NORMAL;");
	db.exec("PRAGMA foreign_keys = ON;");
	return db;
};

export const storageInternals = {
	openSqlite,
	ensureDir,
};
