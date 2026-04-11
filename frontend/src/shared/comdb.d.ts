declare module "comdb" {
	const plugin: unknown;
	export default plugin;
}

declare namespace PouchDB {
	// biome-ignore lint/complexity/noBannedTypes: upstream PouchDB.Database uses `{}` for its Content generic default, and interface augmentation must match the original signature exactly.
	interface Database<Content extends {} = {}> {
		setPassword(
			password: string,
			opts?: { name?: string; opts?: unknown },
		): Promise<void>;
		importComDB(
			password: string,
			exportString: string,
			opts?: { name?: string; opts?: unknown },
		): Promise<void>;
		exportComDB(): Promise<string>;
		loadEncrypted(opts?: object): Promise<unknown>;
		loadDecrypted(opts?: object): Promise<unknown>;
	}
}
