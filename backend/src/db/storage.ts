export type {
	DbEngineKind,
	EngineConfig,
	Storage,
	StorageEngine,
} from "./engine.ts";
export { createEngine } from "./engine.ts";
export { SqlitePerVaultEngine } from "./sqlite_per_vault.ts";
export { SqliteSingleEngine } from "./sqlite_single.ts";
export { ensureDir, openSqlite } from "./sqlite_util.ts";

import { ensureDir, openSqlite } from "./sqlite_util.ts";

export const storageInternals = {
	openSqlite,
	ensureDir,
};
