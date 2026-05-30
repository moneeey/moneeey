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

export function makeTempStorage(
	kind: DbEngineKind = "sqlite-per-vault",
): TempStorage {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-data-test-" });
	const storage = createEngine({
		kind,
		metaPath: `${root}/meta.sqlite`,
		vaultsDir: `${root}/vaults`,
		singlePath: `${root}/single.sqlite`,
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
