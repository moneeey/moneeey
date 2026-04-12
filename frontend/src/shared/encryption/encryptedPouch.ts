/**
 * Encrypted PouchDB factory.
 *
 * Wraps a plain PouchDB instance with body-level AES-GCM encryption. The
 * actual data key is stored wrapped under a passphrase-derived KEK in a
 * regular (replicating) document at `ENCRYPTION-META`, so other devices with
 * the same passphrase can pull the wrap blob via sync and unlock without any
 * side-channel key transport.
 *
 * Key design points:
 *
 * - **Single database.** No memory adapter, no `_encrypted` sub-database, no
 *   two-DB replication. Plaintext is never on disk; it only exists in
 *   decrypted JS objects that `PersistenceStore` materialises on read.
 * - **`transform-pouch` incoming hook only.** We encrypt on write, and
 *   `PersistenceStore` calls `decryptDoc()` explicitly on reads. We
 *   intentionally do *not* install an outgoing transform — if we did,
 *   outgoing replication would decrypt before sending and leak plaintext to
 *   the remote.
 * - **Passthrough.** Incoming docs that already look encrypted (`sealed`
 *   present) are written as-is. That's how incoming replication of
 *   already-encrypted envelopes from another device works without touching
 *   the key.
 * - **Meta doc is exempted** from the incoming transform by `_id` check —
 *   it is a structural doc, not user content, and must remain readable
 *   without a data key so that `openEncryptedDatabase` can read it before
 *   deriving the KEK.
 * - **Clear-text routing fields.** `_id`, `_rev`, `_deleted`, `_conflicts`,
 *   `entity_type`, `updated` stay out of the ciphertext so PouchDB's
 *   rev-tracking, `PersistenceStore.notifyDocument` dispatch, and
 *   `resolveConflict` continue to work without decrypting every doc.
 *
 * **Invariants to be aware of when extending this module:**
 *
 * - Documents that existed in the DB *before* `setupNewEncryption` installs
 *   the transform remain in plaintext form. `decryptDoc` handles them via
 *   its `isAlreadyEncrypted` passthrough, so reads still work, but the app
 *   will not automatically re-encrypt them. This is acceptable because the
 *   gate only reaches `setupNewEncryption` on an otherwise-empty DB, or one
 *   whose only pre-existing content came from incoming replication of
 *   already-encrypted envelopes.
 * - Concurrent `changePassphrase` calls across two devices produce a
 *   meta-doc conflict. PouchDB's default conflict resolution picks a
 *   winner by `_rev`; the losing passphrase silently stops working and the
 *   user has to unlock with the winner. We surface this as a generic
 *   `wrong_passphrase` error today — if this becomes a real problem,
 *   inspect `_conflicts` on the meta doc and offer a manual reconciliation
 *   step.
 */

import PouchDB from "pouchdb";
import transformPouch from "transform-pouch";

import {
	PBKDF2_PARAMS,
	base64ToBytes,
	bytesToBase64,
	decryptString,
	deriveKek,
	encryptString,
	generateDataKey,
	randomSalt,
	unwrapDataKey,
	wrapDataKey,
} from "./crypto";

(PouchDB as unknown as { plugin: (p: unknown) => void }).plugin(transformPouch);

export const LOCAL_DB_NAME = "moneeey";
export const ENCRYPTION_META_ID = "ENCRYPTION-META";
export const ENCRYPTION_META_SCHEMA_VERSION = 1;

/**
 * Stable string codes thrown from encryption operations. Used as `Error.message`
 * and matched by the gate / settings UI to pick a localised message. Keeping
 * them as a union means typos surface at compile time in the places that
 * switch on them.
 */
export type EncryptionErrorCode =
	| "passphrase_too_short"
	| "wrong_passphrase"
	| "no_meta_doc"
	| "unsupported_schema_version"
	| "no_data_key"
	| "magic_link_timeout"
	| "magic_link_cancelled"
	| "not_found_on_server"
	| "network_error"
	| "unknown_error";

export const encryptionError = (code: EncryptionErrorCode): Error =>
	new Error(code);

/** Fields that stay in the clear alongside `sealed`.
 *
 * Only PouchDB's own structural fields are exempt from encryption.
 * Everything else — including `entity_type` and `updated` — is sealed
 * inside the ciphertext blob. This is safe because every read path
 * (`fetchAllDocs`, `refetch`) runs `decryptDoc` before the data reaches
 * `notifyDocument` or `resolveConflict`. */
const CLEAR_FIELDS: readonly string[] = [
	"_id",
	"_rev",
	"_deleted",
	"_conflicts",
];

const ENCRYPTED_BODY_FIELD = "sealed";

export type MetaDoc = {
	_id: typeof ENCRYPTION_META_ID;
	_rev?: string;
	entity_type: "ENCRYPTION_META";
	schema_version: number;
	kdf: string;
	iterations: number;
	hash: string;
	salt: string;
	wrapped_key: string;
};

/** Splits a plaintext doc into (clearFields, encryptableBody). */
const splitClearFromBody = (
	doc: Record<string, unknown>,
): { clear: Record<string, unknown>; body: Record<string, unknown> } => {
	const clear: Record<string, unknown> = {};
	const body: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(doc)) {
		if (CLEAR_FIELDS.includes(key)) {
			clear[key] = value;
		} else {
			body[key] = value;
		}
	}
	return { clear, body };
};

const isEncryptionMetaDoc = (doc: Record<string, unknown>): boolean =>
	doc._id === ENCRYPTION_META_ID;

const isAlreadyEncrypted = (doc: Record<string, unknown>): boolean =>
	ENCRYPTED_BODY_FIELD in doc;

/**
 * Installs the `transform-pouch` incoming hook on `db` so that every
 * subsequent write encrypts the body under `dataKey`. Idempotent modulo
 * multiple `transform()` calls: calling this again replaces the previous
 * hook (transform-pouch supports re-registration).
 */
export const installEncryptionTransform = (
	db: PouchDB.Database,
	dataKey: CryptoKey,
): void => {
	db.transform({
		incoming: async (doc) => {
			// Meta doc has its own shape and must stay readable without a
			// data key.
			if (isEncryptionMetaDoc(doc)) return doc;
			// Already-encrypted envelopes (from incoming replication or
			// idempotent re-writes) pass through unchanged.
			if (isAlreadyEncrypted(doc)) return doc;

			const { clear, body } = splitClearFromBody(doc);
			const payload = await encryptString(JSON.stringify(body), dataKey);
			return { ...clear, [ENCRYPTED_BODY_FIELD]: payload };
		},
	});
};

/** Opens a raw PouchDB handle at the given name. No encryption transform
 * installed — use this for pre-unlock reads (mode detection, cross-device
 * sync bootstrap). */
export const openRawDatabase = (
	name: string = LOCAL_DB_NAME,
): PouchDB.Database => new PouchDB(name);

/** Reads the meta doc if present. Returns `null` if the DB has no
 * encryption yet (fresh install). Throws `unsupported_schema_version` if
 * the stored schema is newer than the one this build understands — this
 * protects future-dated devices from silently reinterpreting the layout.
 */
export const readMetaDoc = async (
	db: PouchDB.Database,
): Promise<MetaDoc | null> => {
	let doc: MetaDoc;
	try {
		doc = (await db.get(ENCRYPTION_META_ID)) as unknown as MetaDoc;
	} catch (err) {
		if ((err as PouchDB.Core.Error).status === 404) {
			return null;
		}
		throw err;
	}
	if (
		typeof doc.schema_version !== "number" ||
		doc.schema_version > ENCRYPTION_META_SCHEMA_VERSION
	) {
		throw encryptionError("unsupported_schema_version");
	}
	return doc;
};

/** True if the given db has an ENCRYPTION-META doc — i.e. the user is
 * returning and should see the unlock form, not the setup form. */
export const hasEncryptionMeta = async (
	db: PouchDB.Database,
): Promise<boolean> => (await readMetaDoc(db)) !== null;

/**
 * First-time setup: generates a random data key, wraps it under the
 * passphrase-derived KEK, writes the meta doc, installs the transform. The
 * returned data key is the one the caller should hand to
 * `PersistenceStore.setDataKey` — the transform is already installed on
 * `db` as a side-effect.
 */
export const setupNewEncryption = async (
	db: PouchDB.Database,
	passphrase: string,
): Promise<CryptoKey> => {
	const existingMeta = await readMetaDoc(db);
	if (existingMeta) {
		// Should never happen in the gate's flow because we only reach
		// setupNewEncryption when hasEncryptionMeta is false. Defensive.
		throw new Error(
			"ENCRYPTION-META already exists — use unlockExistingEncryption() instead",
		);
	}
	const salt = randomSalt();
	const kek = await deriveKek(passphrase, salt);
	const dataKey = await generateDataKey();
	const wrappedKey = await wrapDataKey(dataKey, kek);

	const meta: MetaDoc = {
		_id: ENCRYPTION_META_ID,
		entity_type: "ENCRYPTION_META",
		schema_version: ENCRYPTION_META_SCHEMA_VERSION,
		kdf: PBKDF2_PARAMS.kdf,
		iterations: PBKDF2_PARAMS.iterations,
		hash: PBKDF2_PARAMS.hash,
		salt: bytesToBase64(salt),
		wrapped_key: wrappedKey,
	};
	await db.put(meta as unknown as PouchDB.Core.PutDocument<object>);
	installEncryptionTransform(db, dataKey);
	return dataKey;
};

/**
 * Verifies `passphrase` against the meta doc in `db` without installing any
 * transform. On success returns the unwrapped data key (which the caller
 * can use for subsequent operations, e.g. re-wrapping under a new
 * passphrase). On failure throws `wrong_passphrase` or `no_meta_doc`.
 *
 * This is the primitive used by the change-passphrase flow to prove the
 * current session actually knows the current passphrase — otherwise any
 * unlocked tab could silently lock out the account owner by rewrapping the
 * data key under a new passphrase.
 */
export const verifyPassphrase = async (
	db: PouchDB.Database,
	passphrase: string,
): Promise<CryptoKey> => {
	const meta = await readMetaDoc(db);
	if (!meta) {
		throw encryptionError("no_meta_doc");
	}
	const salt = base64ToBytes(meta.salt);
	const kek = await deriveKek(passphrase, salt);
	try {
		return await unwrapDataKey(meta.wrapped_key, kek);
	} catch {
		throw encryptionError("wrong_passphrase");
	}
};

/**
 * Unlock: reads the meta doc, derives the KEK from the passphrase, unwraps
 * the data key, installs the transform. Throws `wrong_passphrase` on
 * unwrap failure (WebCrypto throws `OperationError` when the GCM tag
 * doesn't verify) and `no_meta_doc` if the database has no encryption set
 * up — the caller should route those to user-visible errors.
 */
export const unlockExistingEncryption = async (
	db: PouchDB.Database,
	passphrase: string,
): Promise<CryptoKey> => {
	const dataKey = await verifyPassphrase(db, passphrase);
	installEncryptionTransform(db, dataKey);
	return dataKey;
};

/**
 * Re-wraps the data key under a new passphrase. O(1): no document walk, no
 * doc-level re-encryption. After this, other devices holding the same
 * database will receive the new meta doc via normal replication and pick up
 * the new passphrase on their next unlock.
 */
export const changePassphrase = async (
	db: PouchDB.Database,
	currentDataKey: CryptoKey,
	newPassphrase: string,
): Promise<void> => {
	const newSalt = randomSalt();
	const newKek = await deriveKek(newPassphrase, newSalt);
	const newWrappedKey = await wrapDataKey(currentDataKey, newKek);

	const existing = await readMetaDoc(db);
	if (!existing) {
		throw encryptionError("no_meta_doc");
	}
	const updated: MetaDoc = {
		...existing,
		salt: bytesToBase64(newSalt),
		wrapped_key: newWrappedKey,
		iterations: PBKDF2_PARAMS.iterations,
		hash: PBKDF2_PARAMS.hash,
		kdf: PBKDF2_PARAMS.kdf,
	};
	await db.put(updated as unknown as PouchDB.Core.PutDocument<object>);
};

/**
 * Decrypts a stored document, returning the plaintext form the app expects.
 * Passthrough for the meta doc and any doc that lacks `sealed` —
 * the latter handles legacy / pre-setup plaintext rows that predate the
 * encryption transform.
 */
export const decryptDoc = async <T extends Record<string, unknown>>(
	doc: T,
	dataKey: CryptoKey,
): Promise<T> => {
	if (isEncryptionMetaDoc(doc)) return doc;
	if (!isAlreadyEncrypted(doc)) return doc;
	const payload = doc[ENCRYPTED_BODY_FIELD] as string;
	const plaintext = await decryptString(payload, dataKey);
	const body = JSON.parse(plaintext) as Record<string, unknown>;
	const { [ENCRYPTED_BODY_FIELD]: _omitted, ...rest } = doc;
	return { ...rest, ...body } as T;
};
