declare module "comdb" {
	const plugin: unknown;
	export default plugin;
}

declare namespace PouchDB {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
