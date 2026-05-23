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

export type MetaDoc = {
	schema_version: number;
	kdf: string;
	iterations: number;
	hash: string;
	salt: string;
	wrapped_key: string;
};

export interface MetaStore {
	getEncryptionMeta(): Promise<MetaDoc | null>;
	setEncryptionMeta(meta: MetaDoc): Promise<void>;
}

const CLEAR_FIELDS = ["_id", "updated", "_deleted"] as const;
type ClearField = (typeof CLEAR_FIELDS)[number];
const isClearField = (key: string): key is ClearField =>
	(CLEAR_FIELDS as readonly string[]).includes(key);

export const readMetaDoc = async (
	store: MetaStore,
): Promise<MetaDoc | null> => {
	const meta = await store.getEncryptionMeta();
	if (!meta) return null;
	if (
		typeof meta.schema_version !== "number" ||
		meta.schema_version > ENCRYPTION_META_SCHEMA_VERSION
	) {
		throw encryptionError("unsupported_schema_version");
	}
	return meta;
};

export const hasEncryptionMeta = async (store: MetaStore): Promise<boolean> =>
	(await readMetaDoc(store)) !== null;

export const setupNewEncryption = async (
	store: MetaStore,
	passphrase: string,
): Promise<CryptoKey> => {
	const existing = await readMetaDoc(store);
	if (existing) {
		throw new Error("encryption meta already exists — use unlock instead");
	}
	const salt = randomSalt();
	const kek = await deriveKek(passphrase, salt);
	const dataKey = await generateDataKey();
	const wrappedKey = await wrapDataKey(dataKey, kek);
	await store.setEncryptionMeta({
		schema_version: ENCRYPTION_META_SCHEMA_VERSION,
		kdf: PBKDF2_PARAMS.kdf,
		iterations: PBKDF2_PARAMS.iterations,
		hash: PBKDF2_PARAMS.hash,
		salt: bytesToBase64(salt),
		wrapped_key: wrappedKey,
	});
	return dataKey;
};

export const verifyPassphrase = async (
	store: MetaStore,
	passphrase: string,
): Promise<CryptoKey> => {
	const meta = await readMetaDoc(store);
	if (!meta) throw encryptionError("no_meta_doc");
	const salt = base64ToBytes(meta.salt);
	const kek = await deriveKek(passphrase, salt);
	try {
		return await unwrapDataKey(meta.wrapped_key, kek);
	} catch {
		throw encryptionError("wrong_passphrase");
	}
};

export const unlockExistingEncryption = async (
	store: MetaStore,
	passphrase: string,
): Promise<CryptoKey> => verifyPassphrase(store, passphrase);

export const changePassphrase = async (
	store: MetaStore,
	currentDataKey: CryptoKey,
	newPassphrase: string,
): Promise<void> => {
	const existing = await readMetaDoc(store);
	if (!existing) throw encryptionError("no_meta_doc");
	const newSalt = randomSalt();
	const newKek = await deriveKek(newPassphrase, newSalt);
	const newWrappedKey = await wrapDataKey(currentDataKey, newKek);
	await store.setEncryptionMeta({
		...existing,
		salt: bytesToBase64(newSalt),
		wrapped_key: newWrappedKey,
		iterations: PBKDF2_PARAMS.iterations,
		hash: PBKDF2_PARAMS.hash,
		kdf: PBKDF2_PARAMS.kdf,
	});
};

export type PlainEntity = Record<string, unknown> & {
	_id: string;
	updated: string;
	_deleted?: boolean;
};

export type EncryptedRecord = {
	_id: string;
	updated: string;
	deletedAt: string | null;
	data: string;
};

export const encryptEntity = async (
	entity: PlainEntity,
	dataKey: CryptoKey,
): Promise<EncryptedRecord> => {
	const body: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(entity)) {
		if (!isClearField(key)) body[key] = value;
	}
	const data = await encryptString(JSON.stringify(body), dataKey);
	return {
		_id: entity._id,
		updated: entity.updated,
		deletedAt: entity._deleted ? entity.updated : null,
		data,
	};
};

export const decryptEntity = async <T extends PlainEntity = PlainEntity>(
	record: {
		_id: string;
		updated: string;
		deletedAt: string | null;
		data: string;
	},
	dataKey: CryptoKey,
): Promise<T> => {
	const bodyJson = await decryptString(record.data, dataKey);
	const body = JSON.parse(bodyJson) as Record<string, unknown>;
	return {
		...body,
		_id: record._id,
		updated: record.updated,
		_deleted: record.deletedAt !== null,
	} as T;
};
