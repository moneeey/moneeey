export async function sha384(value: string): Promise<string> {
	const dataBuffer = new TextEncoder().encode(value);
	const hashBuffer = await crypto.subtle.digest("SHA-384", dataBuffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_REJECT_THRESHOLD =
	Math.floor(256 / ID_ALPHABET.length) * ID_ALPHABET.length;

function randomId(length: number): string {
	const out: string[] = [];
	const buf = new Uint8Array(length * 2);
	while (out.length < length) {
		crypto.getRandomValues(buf);
		for (let i = 0; i < buf.length && out.length < length; i++) {
			const byte = buf[i];
			if (byte >= ID_REJECT_THRESHOLD) continue;
			out.push(ID_ALPHABET[byte % ID_ALPHABET.length]);
		}
	}
	return out.join("");
}

export function generateVaultId(length = 21): string {
	return randomId(length);
}

export function generateUserId(length = 21): string {
	return `u${randomId(length)}`;
}

export function randomTokenHex(bytes = 32): string {
	const buf = new Uint8Array(bytes);
	crypto.getRandomValues(buf);
	return Array.from(buf)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export const TEST_DISPLAY_NAME_PREFIX = "playwright-test-";

export function isTestDisplayName(displayName: string): boolean {
	return displayName.startsWith(TEST_DISPLAY_NAME_PREFIX);
}
