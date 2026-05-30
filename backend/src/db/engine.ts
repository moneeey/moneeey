import { PostgresEngine } from "./postgres.ts";
import type { SqlConn } from "./sql.ts";
import { SqlitePerVaultEngine } from "./sqlite_per_vault.ts";
import { SqliteSingleEngine } from "./sqlite_single.ts";

export type DbEngineKind = "sqlite-per-vault" | "sqlite-single" | "postgres";

export interface StorageEngine {
	withMeta<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T>;
	withVault<T>(vaultId: string, fn: (conn: SqlConn) => Promise<T>): Promise<T>;
	createVaultStore(vaultId: string): Promise<void>;
	deleteVaultStore(vaultId: string): Promise<void>;
	closeAll(): void;
}

export type Storage = StorageEngine;

export interface EngineConfig {
	kind?: DbEngineKind;
	metaPath?: string;
	vaultsDir?: string;
	singlePath?: string;
	maxCachedHandles?: number;
	pgUrl?: string;
}

export function createEngine(config: EngineConfig = {}): StorageEngine {
	const kind = config.kind ?? "sqlite-per-vault";
	switch (kind) {
		case "sqlite-per-vault":
			return new SqlitePerVaultEngine(config);
		case "sqlite-single":
			return new SqliteSingleEngine(config);
		case "postgres":
			return new PostgresEngine(config);
		default:
			throw new Error(`unknown db engine: ${kind}`);
	}
}
