// @ts-nocheck
/**
 * Vendored and patched copy of garbados/comdb
 * (https://github.com/garbados/comdb, v6.0.0-beta, Apache-2.0).
 *
 * The only behavioural change from the original plugin is in `setupEncrypted`
 * and `setupDecrypted`. Upstream comdb computes each encrypted envelope's
 * `_id` as `hash(JSON.stringify(plaintextDoc))`, which means:
 *
 *   - First write of a doc → envelope with id H1
 *   - Update of that doc   → envelope with id H2 (different hash because the
 *                            plaintext, including its `_rev`, has changed)
 *
 * Both envelopes accumulate in the encrypted mirror. When `loadEncrypted()`
 * replicates them back into the in-memory decrypted database, the two
 * envelopes decrypt to two plaintext documents that collide on the same
 * plaintext `_id` ("CONFIG-CONFIG", say) but carry different synthesised
 * `_rev`s. PouchDB stores them as rival rev-1 revisions and deterministically
 * picks a winner — often the *first* (empty) one — so every update to a
 * plaintext document is silently lost on reload.
 *
 * The patch swaps the hash-based envelope id for the plaintext doc's own
 * `_id`, and threads the current envelope `_rev` through so PouchDB can track
 * updates normally. Trade-off: the encrypted mirror (and any remote it
 * replicates to) now exposes the plaintext `_id` — this is acceptable for
 * Moneeey, whose threat model treats `_id`/`_rev` metadata leakage as
 * tolerable (see frontend/src/shared/EncryptionStore.ts / the encryption
 * plan).
 */

import Crypt from "garbados-crypt";
import transform from "transform-pouch";
import { v4 as uuid } from "uuid";

const PASSWORD_REQUIRED = "You must provide a password.";
const PASSWORD_NOT_STRING = "Password must be a string.";
const EXPORT_STRING_REQUIRED = "You must provide an export string.";
const EXPORT_STRING_NOT_STRING = "Your export string must be a string.";
const LOCAL_ID = "_local/comdb";

export default function comdbPatched(PouchDB) {
	// apply plugins
	PouchDB.plugin(transform);

	// apply class method wrappers
	const replicate = PouchDB.replicate;
	PouchDB.replicate = function (source, target, opts = {}) {
		let resolvedSource = source;
		let resolvedTarget = target;
		if (opts.comdb !== false) {
			if (resolvedSource._encrypted) resolvedSource = resolvedSource._encrypted;
			if (resolvedTarget._encrypted) resolvedTarget = resolvedTarget._encrypted;
		}
		return replicate.call(this, resolvedSource, resolvedTarget, opts);
	};

	// apply instance method wrappers
	const destroy = PouchDB.prototype.destroy;
	PouchDB.prototype.destroy = async function (opts = {}) {
		let promise: Promise<unknown> | undefined;
		if (!this._encrypted || opts.unencrypted_only) {
			if (!this._destroyed) {
				promise = destroy.call(this, opts);
			}
		} else if (opts.encrypted_only) {
			if (!this._encrypted._destroyed) {
				promise = destroy.call(this._encrypted, opts);
			}
		} else {
			const promises = [];
			if (!this._destroyed) {
				promises.push(destroy.call(this, opts));
			}
			if (!this._encrypted._destroyed) {
				promises.push(destroy.call(this._encrypted, opts));
			}
			promise = Promise.all(promises);
		}
		return promise;
	};

	function setupEncrypted(name, opts) {
		const db = new PouchDB(name, opts);

		db.transform({
			// encrypt docs as they go in
			incoming: async (doc) => {
				if (doc.isEncrypted) {
					// already-encrypted envelopes are written through as-is
					// (path used by incoming replication from another
					// encrypted mirror)
					return doc;
				}

				// Encrypt the plaintext body. We intentionally strip `_rev`
				// from the payload before encrypting so that the envelope
				// payload does not carry the pre-update rev — that rev is
				// only meaningful on the plaintext side and would confuse
				// loadEncrypted's reconstruction on reload.
				const { _rev: _strippedRev, ...plaintextForEncryption } = doc;
				const json = JSON.stringify(plaintextForEncryption);
				const payload = await this._crypt.encrypt(json);

				// Use the plaintext `_id` as the envelope `_id`. This means
				// each plaintext doc has exactly one envelope in the
				// encrypted mirror, and updates flow through PouchDB's
				// normal rev-tracking.
				const id = doc._id;

				// For updates we need to know the envelope's current `_rev`
				// so PouchDB accepts the new revision. Look it up.
				let existingRev: string | undefined;
				try {
					const existing = await db.get(id);
					existingRev = existing._rev;
				} catch (err) {
					if (err && err.status !== 404) {
						throw err;
					}
				}

				const encrypted = { _id: id, payload, isEncrypted: true };
				if (existingRev) {
					encrypted._rev = existingRev;
				}
				return encrypted;
			},
		});

		return db;
	}

	function setupDecrypted() {
		this.transform({
			incoming: async (doc) => {
				if (doc.isEncrypted) {
					// decrypt encrypted payloads being fed back from the
					// encrypted db (e.g. via loadEncrypted)
					const json = await this._crypt.decrypt(doc.payload);
					const decrypted = JSON.parse(json);
					// The envelope keeps the authoritative _id and _rev for
					// this document; surface them on the plaintext that
					// flows into the decrypted db.
					decrypted._id = doc._id;
					decrypted._rev = doc._rev;
					return decrypted;
				}
				if (!doc._id) doc._id = uuid();
				await this._encrypted.bulkDocs([doc]);
				return doc;
			},
		});
	}

	async function setupCrypt(password) {
		try {
			const { exportString } = await this._encrypted.get(LOCAL_ID);
			this._crypt = await Crypt.import(password, exportString);
		} catch (err) {
			if (err.status === 404) {
				this._crypt = new Crypt(password);
				const exportString = await this._crypt.export();
				try {
					await this._encrypted.put({ _id: LOCAL_ID, exportString });
				} catch (err2) {
					if (err2.status === 409) {
						await setupCrypt.call(this, password);
					} else {
						throw err2;
					}
				}
			} else {
				throw err;
			}
		}
	}

	async function importCrypt(password, exportString) {
		this._crypt = await Crypt.import(password, exportString);
		try {
			await this._encrypted.put({ _id: LOCAL_ID, exportString });
		} catch (err) {
			if (err.status !== 409) {
				throw err;
			}
		}
	}

	function parseEncryptedOpts(opts) {
		return [opts.name || `${this.name}-encrypted`, opts.opts || {}];
	}

	function setupComDB(opts) {
		const [encryptedName, encryptedOpts] = parseEncryptedOpts.call(this, opts);
		this._encrypted = setupEncrypted.call(this, encryptedName, encryptedOpts);
		setupDecrypted.call(this);
	}

	// setup function; must call before anything works
	PouchDB.prototype.setPassword = async function (password, opts = {}) {
		if (!password) {
			throw new Error(PASSWORD_REQUIRED);
		}
		if (typeof password !== "string") {
			throw new Error(PASSWORD_NOT_STRING);
		}
		setupComDB.call(this, opts);
		await setupCrypt.call(this, password);
	};

	PouchDB.prototype.importComDB = async function (
		password,
		exportString,
		opts = {},
	) {
		if (!password) {
			throw new Error(PASSWORD_REQUIRED);
		}
		if (typeof password !== "string") {
			throw new Error(PASSWORD_NOT_STRING);
		}
		if (!exportString) {
			throw new Error(EXPORT_STRING_REQUIRED);
		}
		if (typeof exportString !== "string") {
			throw new Error(EXPORT_STRING_NOT_STRING);
		}
		setupComDB.call(this, opts);
		await importCrypt.call(this, password, exportString);
	};

	PouchDB.prototype.exportComDB = async function () {
		const { exportString } = await this._encrypted.get(LOCAL_ID);
		return exportString;
	};

	// load from encrypted db, to catch up to offline writes
	PouchDB.prototype.loadEncrypted = async function (opts = {}) {
		return this._encrypted.replicate.to(this, { ...opts, comdb: false });
	};

	PouchDB.prototype.loadDecrypted = function (opts = {}) {
		const changes = this.changes({ ...opts, include_docs: true });
		const promises = [];
		changes.on("change", ({ doc }) => {
			promises.push(this._encrypted.bulkDocs([doc]));
		});
		if (opts.live) {
			return changes;
		}
		const closed = new Promise((resolve, reject) => {
			changes.on("complete", resolve);
			changes.on("error", reject);
		});
		return closed.then(() => {
			return Promise.all(promises);
		});
	};
}
