/**
 * Encrypted PouchDB: body-level AES-GCM encryption via transform-pouch.
 *
 * - Single DB, incoming transform only (no outgoing — replication sends ciphertext).
 * - Docs with `sealed` field pass through (incoming replication from another device).
 * - ENCRYPTION-META doc is exempt from transform (must be readable without key).
 * - Pre-existing plaintext docs pass through decryptDoc unchanged.
 * - Concurrent changePassphrase across devices causes a meta-doc conflict;
 *   losing passphrase stops working (surfaced as wrong_passphrase).
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

export type EncryptionErrorCode =
	| "passphrase_too_short"
	| "wrong_passphrase"
	| "no_meta_doc"
	| "unsupported_schema_version"
	| "no_data_key"
	| "not_found_on_server"
	| "network_error"
	| "unknown_error";

export const encryptionError = (code: EncryptionErrorCode): Error =>
	new Error(code);

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

export const installEncryptionTransform = (
	db: PouchDB.Database,
	dataKey: CryptoKey,
): void => {
	db.transform({
		incoming: async (doc) => {
			if (isEncryptionMetaDoc(doc)) return doc;
			if (isAlreadyEncrypted(doc)) return doc;
			const { clear, body } = splitClearFromBody(doc);
			const payload = await encryptString(JSON.stringify(body), dataKey);
			return { ...clear, [ENCRYPTED_BODY_FIELD]: payload };
		},
	});
};

export const openRawDatabase = (
	name: string = LOCAL_DB_NAME,
): PouchDB.Database => new PouchDB(name);

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

export const hasEncryptionMeta = async (
	db: PouchDB.Database,
): Promise<boolean> => (await readMetaDoc(db)) !== null;

export const setupNewEncryption = async (
	db: PouchDB.Database,
	passphrase: string,
): Promise<CryptoKey> => {
	const existingMeta = await readMetaDoc(db);
	if (existingMeta) {
		throw new Error("ENCRYPTION-META already exists — use unlock instead");
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

export const unlockExistingEncryption = async (
	db: PouchDB.Database,
	passphrase: string,
): Promise<CryptoKey> => {
	const dataKey = await verifyPassphrase(db, passphrase);
	installEncryptionTransform(db, dataKey);
	return dataKey;
};

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
