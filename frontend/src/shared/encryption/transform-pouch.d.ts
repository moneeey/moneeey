declare module "transform-pouch" {
	const plugin: unknown;
	export default plugin;
}

declare namespace PouchDB {
	type TransformIncoming = (
		doc: Record<string, unknown>,
	) => Promise<Record<string, unknown>> | Record<string, unknown>;
	type TransformOutgoing = (
		doc: Record<string, unknown>,
	) => Promise<Record<string, unknown>> | Record<string, unknown>;

	// biome-ignore lint/complexity/noBannedTypes: must match upstream PouchDB.Database Content generic default `{}`
	interface Database<Content extends {} = {}> {
		transform(opts: {
			incoming?: TransformIncoming;
			outgoing?: TransformOutgoing;
		}): void;
	}
}
