import { type StorageEngine, createEngine } from "../db/engine.ts";

export type TempStorage = {
	storage: StorageEngine;
	root: string;
	cleanup: () => void;
};

export function makeTempStorage(): TempStorage {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-data-test-" });
	const storage = createEngine({ sqlitePath: `${root}/moneeey.sqlite` });
	return {
		storage,
		root,
		cleanup: () => {
			storage.closeAll();
			Deno.removeSync(root, { recursive: true });
		},
	};
}
