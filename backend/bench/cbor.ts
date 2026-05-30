function head(major: number, len: number): number[] {
	if (len < 24) return [(major << 5) | len];
	if (len < 0x100) return [(major << 5) | 24, len];
	if (len < 0x10000) return [(major << 5) | 25, len >> 8, len & 0xff];
	return [
		(major << 5) | 26,
		(len >>> 24) & 0xff,
		(len >> 16) & 0xff,
		(len >> 8) & 0xff,
		len & 0xff,
	];
}

const uint = (n: number): number[] => head(0, n);
const negInt = (n: number): number[] => head(1, -1 - n);
const bytes = (u8: Uint8Array): number[] => [...head(2, u8.length), ...u8];
const text = (s: string): number[] => {
	const u = new TextEncoder().encode(s);
	return [...head(3, u.length), ...u];
};
const mapHeader = (pairs: number): number[] => head(5, pairs);

export function coseKeyEs256(x: Uint8Array, y: Uint8Array): Uint8Array {
	return new Uint8Array([
		...mapHeader(5),
		...uint(1),
		...uint(2),
		...uint(3),
		...negInt(-7),
		...negInt(-1),
		...uint(1),
		...negInt(-2),
		...bytes(x),
		...negInt(-3),
		...bytes(y),
	]);
}

export function attestationObjectNone(authData: Uint8Array): Uint8Array {
	return new Uint8Array([
		...mapHeader(3),
		...text("fmt"),
		...text("none"),
		...text("attStmt"),
		...mapHeader(0),
		...text("authData"),
		...bytes(authData),
	]);
}
