/**
 * WebCrypto primitives for Moneeey's at-rest encryption.
 *
 * Scheme: random 256-bit data key (AES-GCM) wraps document bodies; that data
 * key is itself wrapped by a KEK derived from the user's passphrase via
 * PBKDF2-SHA256. The wrapped data key plus its salt is stored in an
 * `ENCRYPTION-META` document that replicates with the rest of the database,
 * so other devices with the same passphrase can unwrap it and decrypt.
 *
 * Changing the passphrase re-wraps the same data key, which is an O(1)
 * operation and lets all devices converge after replication of a single doc.
 *
 * Everything here is a thin wrapper around `crypto.subtle` — no external
 * dependencies, no bundle cost beyond ~100 lines.
 */

// Tune-ables. PBKDF2 iteration count per OWASP 2023 guidance.
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const KDF_NAME = "PBKDF2";
const CIPHER_NAME = "AES-GCM";
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12; // 96 bits, recommended for AES-GCM
const SALT_LENGTH_BYTES = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Returns the SubtleCrypto interface, or throws a descriptive error if
 * WebCrypto isn't available (e.g. non-secure-context HTTP). Chrome, Firefox,
 * and Safari require HTTPS or `localhost` for `crypto.subtle` — a hostname
 * like `local.moneeey.io` that resolves to loopback does NOT qualify.
 */
const getSubtle = (): SubtleCrypto => {
	const c = globalThis.crypto;
	if (!c?.subtle) {
		throw new Error(
			`insecure_context: crypto.subtle requires HTTPS or localhost. Current origin: ${globalThis.location?.origin ?? "unknown"}`,
		);
	}
	return c.subtle;
};

/**
 * Early check the caller can run before entering any async crypto flow.
 * Returns `true` if WebCrypto is usable, `false` otherwise. The gate uses
 * this to show a helpful message instead of an opaque "something went wrong".
 */
export const isWebCryptoAvailable = (): boolean => {
	try {
		getSubtle();
		return true;
	} catch {
		return false;
	}
};

/** Converts Uint8Array → base64 string (browser-safe, no Buffer). */
export const bytesToBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
};

/** Converts base64 string → Uint8Array. */
export const base64ToBytes = (base64: string): Uint8Array => {
	const binary = atob(base64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		out[i] = binary.charCodeAt(i);
	}
	return out;
};

/** Generates cryptographically-random salt bytes.
 * Uses `crypto.getRandomValues` directly — this API is available even in
 * insecure contexts, unlike `crypto.subtle`. */
export const randomSalt = (): Uint8Array => {
	const salt = new Uint8Array(SALT_LENGTH_BYTES);
	globalThis.crypto.getRandomValues(salt);
	return salt;
};

/** Generates cryptographically-random IV bytes for AES-GCM. */
const randomIv = (): Uint8Array => {
	const iv = new Uint8Array(IV_LENGTH_BYTES);
	globalThis.crypto.getRandomValues(iv);
	return iv;
};

/**
 * Derives a key-encryption key (KEK) from a passphrase and salt. The returned
 * CryptoKey is only usable for wrapping/unwrapping other AES-GCM keys — it
 * cannot be used to encrypt documents directly, which keeps the passphrase
 * from being used as a document key by accident.
 */
export const deriveKek = async (
	passphrase: string,
	salt: Uint8Array,
): Promise<CryptoKey> => {
	const subtle = getSubtle();
	const passphraseKey = await subtle.importKey(
		"raw",
		textEncoder.encode(passphrase),
		{ name: KDF_NAME },
		false,
		["deriveKey"],
	);
	return subtle.deriveKey(
		{
			name: KDF_NAME,
			salt: salt as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: PBKDF2_HASH,
		},
		passphraseKey,
		{ name: CIPHER_NAME, length: KEY_LENGTH_BITS },
		false, // not extractable — forces the KEK to stay inside WebCrypto
		["wrapKey", "unwrapKey"],
	);
};

/** Generates a fresh random data key. This is the key that actually
 * encrypts document bodies. It is marked extractable so we can wrap it. */
export const generateDataKey = async (): Promise<CryptoKey> => {
	return getSubtle().generateKey(
		{ name: CIPHER_NAME, length: KEY_LENGTH_BITS },
		true,
		["encrypt", "decrypt"],
	);
};

/** Wraps the data key with the KEK. Returns a base64 string containing
 * IV || ciphertext (the IV is prepended so we can unwrap later without a
 * separate metadata field). */
export const wrapDataKey = async (
	dataKey: CryptoKey,
	kek: CryptoKey,
): Promise<string> => {
	const subtle = getSubtle();
	const iv = randomIv();
	const wrapped = await subtle.wrapKey("raw", dataKey, kek, {
		name: CIPHER_NAME,
		iv: iv as BufferSource,
	});
	const wrappedBytes = new Uint8Array(wrapped);
	const combined = new Uint8Array(iv.length + wrappedBytes.length);
	combined.set(iv, 0);
	combined.set(wrappedBytes, iv.length);
	return bytesToBase64(combined);
};

/** Unwraps a base64 wrapped-key blob (IV || ciphertext) with the KEK. */
export const unwrapDataKey = async (
	wrappedBase64: string,
	kek: CryptoKey,
): Promise<CryptoKey> => {
	const combined = base64ToBytes(wrappedBase64);
	const iv = combined.slice(0, IV_LENGTH_BYTES);
	const wrapped = combined.slice(IV_LENGTH_BYTES);
	return getSubtle().unwrapKey(
		"raw",
		wrapped as BufferSource,
		kek,
		{ name: CIPHER_NAME, iv: iv as BufferSource },
		{ name: CIPHER_NAME, length: KEY_LENGTH_BITS },
		true,
		["encrypt", "decrypt"],
	);
};

/**
 * Encrypts a UTF-8 plaintext string under `dataKey`. Returns a base64 string
 * of IV || ciphertext — same "prefixed IV" convention as wrapDataKey so the
 * decrypt side needs only the key + the blob.
 */
export const encryptString = async (
	plaintext: string,
	dataKey: CryptoKey,
): Promise<string> => {
	const iv = randomIv();
	const cipherBuffer = await getSubtle().encrypt(
		{ name: CIPHER_NAME, iv: iv as BufferSource },
		dataKey,
		textEncoder.encode(plaintext) as BufferSource,
	);
	const cipherBytes = new Uint8Array(cipherBuffer);
	const combined = new Uint8Array(iv.length + cipherBytes.length);
	combined.set(iv, 0);
	combined.set(cipherBytes, iv.length);
	return bytesToBase64(combined);
};

/** Decrypts a blob produced by `encryptString`. Throws on MAC failure
 * (i.e. wrong key or tampered data). */
export const decryptString = async (
	combinedBase64: string,
	dataKey: CryptoKey,
): Promise<string> => {
	const combined = base64ToBytes(combinedBase64);
	const iv = combined.slice(0, IV_LENGTH_BYTES);
	const cipher = combined.slice(IV_LENGTH_BYTES);
	const plainBuffer = await getSubtle().decrypt(
		{ name: CIPHER_NAME, iv: iv as BufferSource },
		dataKey,
		cipher as BufferSource,
	);
	return textDecoder.decode(plainBuffer);
};

/** Exposed for tests + meta-doc construction. */
export const PBKDF2_PARAMS = {
	iterations: PBKDF2_ITERATIONS,
	hash: PBKDF2_HASH,
	kdf: KDF_NAME,
} as const;
