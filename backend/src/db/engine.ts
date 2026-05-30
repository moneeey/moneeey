import type { SqlConn } from "./sql.ts";
import { SqliteEngine } from "./sqlite.ts";

export interface StorageEngine {
	withConn<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T>;
	withRead<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T>;
	closeAll(): void;
}

export type Storage = StorageEngine;

export interface EngineConfig {
	sqlitePath?: string;
}

export function createEngine(config: EngineConfig = {}): StorageEngine {
	return new SqliteEngine(config);
}
