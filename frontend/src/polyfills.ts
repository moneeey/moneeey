// @ts-nocheck
import _ from "lodash";

// Lodash on window is kept here because user-facing dev tools (and legacy
// code paths) rely on it. No other polyfills are required — the encryption
// layer uses native WebCrypto, and since comdb was removed we no longer pull
// in levelup/memdown which needed Node-built-in shims.
window._ = _;
