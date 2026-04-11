// @ts-nocheck
import _ from "lodash";

// `global`, `process`, and `Buffer` are injected by vite-plugin-node-polyfills.
// Only lodash-on-window is kept here because user-facing dev tools rely on it.
window._ = _;

// pouchdb-adapter-memory → memdown calls Node's `setImmediate`, which the
// browser does not provide. A setTimeout(0) shim is sufficient because memdown
// only uses it to defer async callbacks out of the current tick.
if (typeof window.setImmediate !== "function") {
	window.setImmediate = ((cb: (...args: unknown[]) => void, ...args: unknown[]) =>
		window.setTimeout(() => cb(...args), 0)) as typeof window.setImmediate;
}
if (typeof window.clearImmediate !== "function") {
	window.clearImmediate = ((id: number) =>
		window.clearTimeout(id)) as typeof window.clearImmediate;
}
