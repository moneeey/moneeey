import { Storage } from "../db/storage.ts";

export type TempStorage = {
	storage: Storage;
	root: string;
	cleanup: () => void;
};

export function makeTempStorage(): TempStorage {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-data-test-" });
	const storage = new Storage({
		metaPath: `${root}/meta.sqlite`,
		vaultsDir: `${root}/vaults`,
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
