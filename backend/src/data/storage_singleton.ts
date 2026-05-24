import { Storage } from "../db/storage.ts";

let instance: Storage | null = null;

export function getStorage(): Storage {
	if (!instance) {
		instance = new Storage();
	}
	return instance;
}

export function setStorageForTest(storage: Storage | null): void {
	instance = storage;
}
