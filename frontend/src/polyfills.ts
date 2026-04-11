// @ts-nocheck
import _ from "lodash";

// `global`, `process`, and `Buffer` are injected by vite-plugin-node-polyfills.
// Only lodash-on-window is kept here because user-facing dev tools rely on it.
window._ = _;
