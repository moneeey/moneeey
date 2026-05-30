import { PostgresEngine } from "./postgres.ts";
import type { SqlConn } from "./sql.ts";
import { SqliteEngine } from "./sqlite.ts";

export type DbEngineKind = "sqlite" | "postgres";

export interface StorageEngine {
	withMeta<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T>;
	withVault<T>(vaultId: string, fn: (conn: SqlConn) => Promise<T>): Promise<T>;
	deleteVaultStore(vaultId: string): Promise<void>;
	closeAll(): void;
}

export type Storage = StorageEngine;

export interface EngineConfig {
	kind?: DbEngineKind;
	sqlitePath?: string;
	pgUrl?: string;
}

export function createEngine(config: EngineConfig = {}): StorageEngine {
	const kind = config.kind ?? "sqlite";
	switch (kind) {
		case "sqlite":
			return new SqliteEngine(config);
		case "postgres":
			return new PostgresEngine(config);
		default:
			throw new Error(`unknown db engine: ${kind}`);
	}
}
