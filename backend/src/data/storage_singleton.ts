import { type StorageEngine, createEngine } from "../db/engine.ts";

let instance: StorageEngine | null = null;

export function getStorage(): StorageEngine {
	if (!instance) {
		instance = createEngine();
	}
	return instance;
}

export function setStorageForTest(storage: StorageEngine | null): void {
	instance = storage;
}
