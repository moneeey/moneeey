import { jose } from "./src/deps.ts";

export const ALG = "RS512";

if (import.meta.main) {
  const { privateKey, publicKey } = await jose.generateKeyPair(ALG, {
    extractable: true,
  });
  const exportable = (str: string) => jose.base64url.encode(str);

  console.log(`
JWT_PUBLIC_KEY="${exportable(await jose.exportSPKI(publicKey))}"
JWT_PRIVATE_KEY="${exportable(await jose.exportPKCS8(privateKey))}"
`);
}
