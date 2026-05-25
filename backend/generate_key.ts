import { jose } from "./src/deps.ts";

export const ALG = "RS512";

if (import.meta.main) {
	const { privateKey, publicKey } = await jose.generateKeyPair(ALG, {
		extractable: true,
	});
	const exportable = (str: string) => jose.base64url.encode(str);

	const publicKeyStr = await jose.exportSPKI(publicKey);
	const privateKeyStr = await jose.exportPKCS8(privateKey);

	console.log(`
.env
  JWT_PUBLIC_KEY="${exportable(publicKeyStr)}"
  JWT_PRIVATE_KEY="${exportable(privateKeyStr)}"
`);
}
