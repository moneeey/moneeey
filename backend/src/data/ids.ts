export async function sha384(value: string): Promise<string> {
	const dataBuffer = new TextEncoder().encode(value);
	const hashBuffer = await crypto.subtle.digest("SHA-384", dataBuffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function passkeyUserId(email: string): Promise<string> {
	return `user:passkey${await sha384(`passkey:${email}`)}`;
}

const VAULT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const VAULT_ID_REJECT_THRESHOLD =
	Math.floor(256 / VAULT_ID_ALPHABET.length) * VAULT_ID_ALPHABET.length;

export function generateVaultId(length = 21): string {
	const out: string[] = [];
	const buf = new Uint8Array(length * 2);
	while (out.length < length) {
		crypto.getRandomValues(buf);
		for (let i = 0; i < buf.length && out.length < length; i++) {
			const byte = buf[i];
			if (byte >= VAULT_ID_REJECT_THRESHOLD) continue;
			out.push(VAULT_ID_ALPHABET[byte % VAULT_ID_ALPHABET.length]);
		}
	}
	return out.join("");
}

export function isTestEmail(email: string): boolean {
	return email.toLowerCase().endsWith("@playwright.local");
}
