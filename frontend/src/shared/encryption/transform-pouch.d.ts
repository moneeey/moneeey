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

	// biome-ignore lint/complexity/noBannedTypes: upstream PouchDB.Database
	// uses `{}` as the Content generic default, so our augmentation must
	// match exactly for TypeScript to merge the declarations.
	interface Database<Content extends {} = {}> {
		transform(opts: {
			incoming?: TransformIncoming;
			outgoing?: TransformOutgoing;
		}): void;
	}
}
