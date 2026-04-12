/**
 * WebCrypto primitives for Moneeey's at-rest encryption.
 *
 * Scheme: random 256-bit data key (AES-GCM) wraps document bodies; that key
 * is itself wrapped by a KEK derived from the user's passphrase via
 * PBKDF2-SHA256. The wrapped key + salt live in a replicating ENCRYPTION-META
 * document. Changing the passphrase re-wraps the same data key (O(1)).
 */

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const KDF_NAME = "PBKDF2";
const CIPHER_NAME = "AES-GCM";
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;
const SALT_LENGTH_BYTES = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// crypto.subtle requires HTTPS or localhost — custom hostnames over HTTP
// do NOT qualify even if they resolve to loopback.
const getSubtle = (): SubtleCrypto => {
	const c = globalThis.crypto;
	if (!c?.subtle) {
		throw new Error(
			`insecure_context: crypto.subtle requires HTTPS or localhost. Current origin: ${globalThis.location?.origin ?? "unknown"}`,
		);
	}
	return c.subtle;
};

export const isWebCryptoAvailable = (): boolean => {
	try {
		getSubtle();
		return true;
	} catch {
		return false;
	}
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
};

export const base64ToBytes = (base64: string): Uint8Array => {
	const binary = atob(base64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		out[i] = binary.charCodeAt(i);
	}
	return out;
};

export const randomSalt = (): Uint8Array => {
	const salt = new Uint8Array(SALT_LENGTH_BYTES);
	globalThis.crypto.getRandomValues(salt);
	return salt;
};

const randomIv = (): Uint8Array => {
	const iv = new Uint8Array(IV_LENGTH_BYTES);
	globalThis.crypto.getRandomValues(iv);
	return iv;
};

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
		false,
		["wrapKey", "unwrapKey"],
	);
};

export const generateDataKey = async (): Promise<CryptoKey> => {
	return getSubtle().generateKey(
		{ name: CIPHER_NAME, length: KEY_LENGTH_BITS },
		true,
		["encrypt", "decrypt"],
	);
};

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

export const PBKDF2_PARAMS = {
	iterations: PBKDF2_ITERATIONS,
	hash: PBKDF2_HASH,
	kdf: KDF_NAME,
} as const;
