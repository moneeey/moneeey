import { MONEEEY_DB_ENGINE } from "../config.ts";
import {
	type DbEngineKind,
	type StorageEngine,
	createEngine,
} from "../db/engine.ts";

let instance: StorageEngine | null = null;

function resolveKind(): DbEngineKind {
	const raw = MONEEEY_DB_ENGINE;
	if (raw === "sqlite" || raw === "postgres") {
		return raw;
	}
	throw new Error(`invalid MONEEEY_DB_ENGINE: ${raw}`);
}

export function getStorage(): StorageEngine {
	if (!instance) {
		instance = createEngine({ kind: resolveKind() });
	}
	return instance;
}

export function setStorageForTest(storage: StorageEngine | null): void {
	instance = storage;
}
