import { attestationObjectNone, coseKeyEs256 } from "./cbor.ts";

const b64uEncode = (bytes: Uint8Array): string => {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64uDecode = (str: string): Uint8Array => {
	const s = str.replace(/-/g, "+").replace(/_/g, "/");
	const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
	const bin = atob(s + pad);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
};

export interface IRegistrationOptions {
	challenge: string;
	rp: { id: string; name: string };
	user: { id: string; name: string; displayName: string };
}

export interface IAuthenticationOptions {
	challenge: string;
	rpId: string;
}

export interface ICredential {
	credentialId: string;
	userHandle: string;
	privateKeyJwk: JsonWebKey;
	counter: number;
}

export interface IRegistrationResult {
	credentialJSON: Record<string, unknown>;
	credential: ICredential;
}

const concat = (...parts: Uint8Array[]): Uint8Array => {
	const total = parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const p of parts) {
		out.set(p, offset);
		offset += p.length;
	}
	return out;
};

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

const sha256 = async (data: Uint8Array): Promise<Uint8Array> =>
	new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));

const uint32be = (n: number): Uint8Array =>
	new Uint8Array([
		(n >>> 24) & 0xff,
		(n >> 16) & 0xff,
		(n >> 8) & 0xff,
		n & 0xff,
	]);

const clientData = (
	type: "webauthn.create" | "webauthn.get",
	challenge: string,
	origin: string,
): Uint8Array =>
	utf8(JSON.stringify({ type, challenge, origin, crossOrigin: false }));

const p1363ToDer = (raw: Uint8Array): Uint8Array => {
	const trim = (b: Uint8Array): Uint8Array => {
		let i = 0;
		while (i < b.length - 1 && b[i] === 0) i++;
		const sliced = b.subarray(i);
		if (sliced[0] & 0x80) {
			const out = new Uint8Array(sliced.length + 1);
			out.set(sliced, 1);
			return out;
		}
		const out = new Uint8Array(sliced.length);
		out.set(sliced);
		return out;
	};
	const r = trim(raw.slice(0, 32));
	const s = trim(raw.slice(32, 64));
	return new Uint8Array([
		0x30,
		2 + r.length + 2 + s.length,
		0x02,
		r.length,
		...r,
		0x02,
		s.length,
		...s,
	]);
};

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_BE = 0x08;
const FLAG_BS = 0x10;
const FLAG_AT = 0x40;

export async function makeRegistration(
	options: IRegistrationOptions,
	origin: string,
): Promise<IRegistrationResult> {
	const keyPair = (await crypto.subtle.generateKey(
		{ name: "ECDSA", namedCurve: "P-256" },
		true,
		["sign", "verify"],
	)) as CryptoKeyPair;
	const rawPub = new Uint8Array(
		await crypto.subtle.exportKey("raw", keyPair.publicKey),
	);
	const x = rawPub.slice(1, 33);
	const y = rawPub.slice(33, 65);
	const cose = coseKeyEs256(x, y);

	const credentialId = crypto.getRandomValues(new Uint8Array(32));
	const rpIdHash = await sha256(utf8(options.rp.id));
	const flags = new Uint8Array([
		FLAG_UP | FLAG_UV | FLAG_BE | FLAG_BS | FLAG_AT,
	]);
	const aaguid = new Uint8Array(16);
	const credIdLen = new Uint8Array([
		(credentialId.length >> 8) & 0xff,
		credentialId.length & 0xff,
	]);
	const authData = concat(
		rpIdHash,
		flags,
		uint32be(0),
		aaguid,
		credIdLen,
		credentialId,
		cose,
	);
	const attestationObject = attestationObjectNone(authData);
	const clientDataJSON = clientData(
		"webauthn.create",
		options.challenge,
		origin,
	);
	const privateKeyJwk = await crypto.subtle.exportKey(
		"jwk",
		keyPair.privateKey,
	);
	const credId64 = b64uEncode(credentialId);

	return {
		credentialJSON: {
			id: credId64,
			rawId: credId64,
			type: "public-key",
			authenticatorAttachment: "platform",
			clientExtensionResults: {},
			response: {
				clientDataJSON: b64uEncode(clientDataJSON),
				attestationObject: b64uEncode(attestationObject),
				transports: ["internal", "hybrid"],
			},
		},
		credential: {
			credentialId: credId64,
			userHandle: options.user.id,
			privateKeyJwk,
			counter: 0,
		},
	};
}

export async function makeAssertion(
	options: IAuthenticationOptions,
	credential: ICredential,
	origin: string,
	signCount: number,
): Promise<Record<string, unknown>> {
	const privateKey = await crypto.subtle.importKey(
		"jwk",
		credential.privateKeyJwk,
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"],
	);
	const rpIdHash = await sha256(utf8(options.rpId));
	const flags = new Uint8Array([FLAG_UP | FLAG_UV | FLAG_BE | FLAG_BS]);
	const authData = concat(rpIdHash, flags, uint32be(signCount));
	const clientDataJSON = clientData("webauthn.get", options.challenge, origin);
	const hash = await sha256(clientDataJSON);
	const rawSig = new Uint8Array(
		await crypto.subtle.sign(
			{ name: "ECDSA", hash: "SHA-256" },
			privateKey,
			concat(authData, hash) as BufferSource,
		),
	);
	const signature = p1363ToDer(rawSig);

	return {
		id: credential.credentialId,
		rawId: credential.credentialId,
		type: "public-key",
		authenticatorAttachment: "platform",
		clientExtensionResults: {},
		response: {
			authenticatorData: b64uEncode(authData),
			clientDataJSON: b64uEncode(clientDataJSON),
			signature: b64uEncode(signature),
			userHandle: credential.userHandle,
		},
	};
}

export const webauthnInternals = { b64uDecode };
