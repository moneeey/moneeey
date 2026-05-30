import {
	type DbEngineKind,
	type StorageEngine,
	createEngine,
} from "../db/engine.ts";

export type TempStorage = {
	storage: StorageEngine;
	root: string;
	cleanup: () => void;
};

export function makeTempStorage(kind: DbEngineKind = "sqlite"): TempStorage {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-data-test-" });
	const storage = createEngine({
		kind,
		sqlitePath: `${root}/moneeey.sqlite`,
	});
	return {
		storage,
		root,
		cleanup: () => {
			storage.closeAll();
			Deno.removeSync(root, { recursive: true });
		},
	};
}
