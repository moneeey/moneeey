import { ALG } from "../generate_key.ts";
import {
  JWT_COUCH_KEY_ID,
  JWT_MAGIC_KEY_ID,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
} from "./config.ts";
import { jose } from "./deps.ts";

const privateKey = await jose.importPKCS8(
  new TextDecoder().decode(jose.base64url.decode(JWT_PRIVATE_KEY)),
  ALG,
);

const publicKey = await jose.importSPKI(
  new TextDecoder().decode(jose.base64url.decode(JWT_PUBLIC_KEY)),
  ALG,
);

async function generateJwt({ email, claims, keyId, expirationTime = '2h' }: { email: string, claims: Record<string, string>, keyId: string, expirationTime: string }) {
  return await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: ALG, kid: keyId })
    .setIssuedAt()
    .setIssuer("moneeey.io")
    .setAudience(`moneeey.io:${keyId}`)
    .setExpirationTime(expirationTime)
    .setSubject(email)
    .sign(privateKey);
}

async function validateJwt(jwtToken: string, keyId: string) {
  return await jose.jwtVerify(jwtToken, publicKey, {
    issuer: "moneeey.io",
    audience: `moneeey.io:${keyId}`,
  });
}

const jwtForKey = (keyId: string) => ({
  generate: (email: string, claims: Record<string, string>, expirationTime: string) => generateJwt({ email, claims, keyId, expirationTime }),
  validate: (jwtToken: string) => validateJwt(jwtToken, keyId),
});

export const magicJwt = jwtForKey(JWT_MAGIC_KEY_ID);
export const couchJwt = jwtForKey(JWT_COUCH_KEY_ID);
