import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type StorageEngine, createEngine } from "../db/engine.ts";

export type TempStorage = {
	storage: StorageEngine;
	root: string;
	cleanup: () => void;
};

export function makeTempStorage(): TempStorage {
	const root = mkdtempSync(join(tmpdir(), "moneeey-data-test-"));
	const storage = createEngine({ sqlitePath: `${root}/moneeey.sqlite` });
	return {
		storage,
		root,
		cleanup: () => {
			storage.closeAll();
			rmSync(root, { recursive: true, force: true });
		},
	};
}
