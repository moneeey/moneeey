import { authenticateAndRespond } from "./auth_session.ts";
import {
	APP_URL,
	WEBAUTHN_ORIGIN,
	WEBAUTHN_RP_ID,
	WEBAUTHN_RP_NAME,
} from "./config.ts";
import {
	createInvite as dataCreateInvite,
	findInvite as dataFindInvite,
	redeemInvite as dataRedeemInvite,
} from "./data/invites.ts";
import { getStorage } from "./data/storage_singleton.ts";
import type {
	InviteRecord,
	StoredCredential,
	UserRecord,
} from "./data/types.ts";
import {
	addCredential as dataAddCredential,
	createUser as dataCreateUser,
	getUserByEmail as dataGetUserByEmail,
	updateCredentialCounter as dataUpdateCredentialCounter,
} from "./data/users.ts";
import {
	VaultFullError,
	createVaultForUser as dataCreateVaultForUser,
	getVaultsByUser as dataGetVaultsByUser,
} from "./data/vaults.ts";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	oak,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "./deps.ts";
import type {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from "./deps.ts";
import { authJwt, challengeJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";

const logger = Logger("passkey");

async function getUserByEmail(email: string): Promise<UserRecord | null> {
	return await dataGetUserByEmail(getStorage(), email);
}

async function createUserAndVault(
	email: string,
	credential: StoredCredential,
): Promise<{ user: UserRecord; vaultId: string }> {
	const storage = getStorage();
	const user = await dataCreateUser(storage, email, credential);
	const vault = await dataCreateVaultForUser(storage, user.id);
	return { user, vaultId: vault.id };
}

async function getPrimaryVaultId(userId: string): Promise<string | null> {
	const vaults = await dataGetVaultsByUser(getStorage(), userId);
	return vaults[0]?.id ?? null;
}

async function createInviteForOwner(
	ownerEmail: string,
): Promise<{ token: string; vaultId: string }> {
	const owner = await dataGetUserByEmail(getStorage(), ownerEmail);
	if (!owner) throw new Error("owner not found");
	const vaultId = await getPrimaryVaultId(owner.id);
	if (!vaultId) throw new Error("owner has no vault");
	const token = await dataCreateInvite(getStorage(), owner.id, vaultId);
	return { token, vaultId };
}

async function findInvite(token: string): Promise<InviteRecord | null> {
	return await dataFindInvite(getStorage(), token);
}

async function registerInvitee(
	email: string,
	credential: StoredCredential,
	inviteToken: string,
): Promise<{ user: UserRecord; vaultId: string }> {
	const storage = getStorage();
	const user = await dataCreateUser(storage, email, credential);
	const vaultId = await dataRedeemInvite(storage, inviteToken, user.id);
	return { user, vaultId };
}

async function updateCredentialCounter(
	email: string,
	credentialId: string,
	newCounter: number,
): Promise<void> {
	await dataUpdateCredentialCounter(
		getStorage(),
		email,
		credentialId,
		newCounter,
	);
}

async function addCredentialForEmail(
	email: string,
	credential: StoredCredential,
): Promise<void> {
	await dataAddCredential(getStorage(), email, credential);
}

export const authPasskeyInternals = {
	getUserByEmail,
	createUserAndVault,
	getPrimaryVaultId,
	createInviteForOwner,
	findInvite,
	registerInvitee,
	updateCredentialCounter,
	addCredentialForEmail,
	generateRegistrationOptions,
	generateAuthenticationOptions,
	verifyRegistrationResponse,
	verifyAuthenticationResponse,
	authenticateAndRespond,
};

const getBodyJson = async (ctx: oak.Context) => {
	return await ctx.request.body({ type: "json" }).value;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const parseEmail = (raw: unknown): string | null => {
	if (typeof raw !== "string") return null;
	const email = raw.toLowerCase().trim();
	if (email.length > 254) return null;
	if (!EMAIL_RE.test(email)) return null;
	return email;
};

function respond(ctx: oak.Context, status: oak.Status, body: object) {
	ctx.response.body = JSON.stringify(body);
	ctx.response.status = status;
}

async function makeFlowToken(
	challenge: string,
	extraClaims: Record<string, string> = {},
) {
	return await challengeJwt.generate(challenge, extraClaims, "5min");
}

async function readFlowToken(
	flowToken: unknown,
): Promise<{ challenge: string; claims: Record<string, unknown> }> {
	if (typeof flowToken !== "string" || flowToken.length === 0) {
		throw new Error("missing flow token");
	}
	const result = await challengeJwt.validate(flowToken);
	return {
		challenge: result.payload.sub || "",
		claims: result.payload as Record<string, unknown>,
	};
}

function credentialToStored(
	verification: {
		registrationInfo: {
			credential: { id: string; publicKey: Uint8Array; counter: number };
			credentialBackedUp: boolean;
		};
	},
	transports?: string[],
): StoredCredential {
	const { credential } = verification.registrationInfo;
	return {
		credentialId: credential.id,
		publicKey: btoa(String.fromCharCode(...credential.publicKey)),
		counter: credential.counter,
		transports: transports as StoredCredential["transports"],
		createdAt: new Date().toISOString(),
	};
}

export function setupPasskey(authRouter: oak.Router) {
	authRouter.post("/passkey/register/options", async (ctx) => {
		try {
			const { email: rawEmail } = await getBodyJson(ctx);
			const email = parseEmail(rawEmail);
			if (!email) {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
				return;
			}

			const existing = await authPasskeyInternals.getUserByEmail(email);
			if (existing) {
				respond(ctx, oak.Status.Conflict, { error: "user already exists" });
				return;
			}

			const options = await authPasskeyInternals.generateRegistrationOptions({
				rpName: WEBAUTHN_RP_NAME,
				rpID: WEBAUTHN_RP_ID,
				userName: email,
				attestationType: "none",
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			});

			const flowToken = await makeFlowToken(options.challenge);
			respond(ctx, oak.Status.OK, { options, flowToken });
		} catch (err) {
			logger.error("register/options error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/register/verify", async (ctx) => {
		try {
			const { email: rawEmail, credential, flowToken } = await getBodyJson(ctx);
			const email = parseEmail(rawEmail);
			if (!email) {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
				return;
			}

			const { challenge: expectedChallenge } = await readFlowToken(flowToken);
			const verification =
				await authPasskeyInternals.verifyRegistrationResponse({
					response: credential as RegistrationResponseJSON,
					expectedChallenge,
					expectedOrigin: WEBAUTHN_ORIGIN,
					expectedRPID: WEBAUTHN_RP_ID,
				});

			if (!verification.verified || !verification.registrationInfo) {
				respond(ctx, oak.Status.BadRequest, { error: "verification failed" });
				return;
			}

			const stored = credentialToStored(
				verification as {
					registrationInfo: NonNullable<typeof verification.registrationInfo>;
				},
				(credential as RegistrationResponseJSON).response.transports,
			);
			const { user, vaultId } = await authPasskeyInternals.createUserAndVault(
				email,
				stored,
			);
			const result = await authPasskeyInternals.authenticateAndRespond(
				ctx,
				"passkey",
				email,
				user.id,
				vaultId,
			);
			respond(ctx, oak.Status.OK, result);
		} catch (err) {
			logger.error("register/verify error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/login/options", async (ctx) => {
		try {
			const { email: rawEmail } = await getBodyJson(ctx);
			const email = parseEmail(rawEmail);
			if (!email) {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
				return;
			}

			const user = await authPasskeyInternals.getUserByEmail(email);
			if (!user) {
				respond(ctx, oak.Status.NotFound, { error: "user not found" });
				return;
			}

			const options = await authPasskeyInternals.generateAuthenticationOptions({
				rpID: WEBAUTHN_RP_ID,
				allowCredentials: user.credentials.map((c) => ({
					id: c.credentialId,
					transports: c.transports,
				})),
				userVerification: "preferred",
			});

			const flowToken = await makeFlowToken(options.challenge);
			respond(ctx, oak.Status.OK, { options, flowToken });
		} catch (err) {
			logger.error("login/options error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/login/verify", async (ctx) => {
		try {
			const { email: rawEmail, credential, flowToken } = await getBodyJson(ctx);
			const email = parseEmail(rawEmail);
			if (!email) {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
				return;
			}

			const user = await authPasskeyInternals.getUserByEmail(email);
			if (!user) {
				respond(ctx, oak.Status.NotFound, { error: "user not found" });
				return;
			}

			const { challenge: expectedChallenge } = await readFlowToken(flowToken);
			const authResponse = credential as AuthenticationResponseJSON;
			const storedCred = user.credentials.find(
				(c) => c.credentialId === authResponse.id,
			);
			if (!storedCred) {
				respond(ctx, oak.Status.BadRequest, { error: "credential not found" });
				return;
			}

			const verification =
				await authPasskeyInternals.verifyAuthenticationResponse({
					response: authResponse,
					expectedChallenge,
					expectedOrigin: WEBAUTHN_ORIGIN,
					expectedRPID: WEBAUTHN_RP_ID,
					credential: {
						id: storedCred.credentialId,
						publicKey: new Uint8Array(
							atob(storedCred.publicKey)
								.split("")
								.map((c) => c.charCodeAt(0)),
						),
						counter: storedCred.counter,
						transports: storedCred.transports,
					},
				});

			if (!verification.verified) {
				respond(ctx, oak.Status.BadRequest, { error: "verification failed" });
				return;
			}

			await authPasskeyInternals.updateCredentialCounter(
				email,
				storedCred.credentialId,
				verification.authenticationInfo.newCounter,
			);

			const vaultId = await authPasskeyInternals.getPrimaryVaultId(user.id);
			if (!vaultId) {
				respond(ctx, oak.Status.InternalServerError, {
					error: "user has no vault",
				});
				return;
			}

			const result = await authPasskeyInternals.authenticateAndRespond(
				ctx,
				"passkey",
				email,
				user.id,
				vaultId,
			);
			respond(ctx, oak.Status.OK, result);
		} catch (err) {
			logger.error("login/verify error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/invite/create", async (ctx) => {
		try {
			const authToken = await ctx.cookies.get("authToken");
			if (!authToken) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}
			const validated = await authJwt.validate(authToken);
			const email = validated.payload.sub;
			if (!email) {
				respond(ctx, oak.Status.Unauthorized, { error: "not authenticated" });
				return;
			}

			try {
				const { token } = await authPasskeyInternals.createInviteForOwner(email);
				const inviteUrl = `${APP_URL}/#/invite/${token}`;
				respond(ctx, oak.Status.OK, { inviteUrl, token });
			} catch (err) {
				if ((err as Error).message === "invite_quota_exceeded") {
					respond(ctx, oak.Status.TooManyRequests, {
						error: "invite_quota_exceeded",
					});
					return;
				}
				throw err;
			}
		} catch (err) {
			logger.error("invite/create error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/invite/info", async (ctx) => {
		try {
			const { token } = await getBodyJson(ctx);
			const found = await authPasskeyInternals.findInvite(token);
			if (!found) {
				respond(ctx, oak.Status.NotFound, { error: "invite not found" });
				return;
			}
			respond(ctx, oak.Status.OK, { valid: true });
		} catch (err) {
			logger.error("invite/info error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/invite/register/options", async (ctx) => {
		try {
			const { token, email: rawEmail } = await getBodyJson(ctx);
			const email = parseEmail(rawEmail);
			if (!email) {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
				return;
			}

			const found = await authPasskeyInternals.findInvite(token);
			if (!found) {
				respond(ctx, oak.Status.NotFound, { error: "invite not found" });
				return;
			}

			const existing = await authPasskeyInternals.getUserByEmail(email);
			if (existing) {
				respond(ctx, oak.Status.Conflict, { error: "user already exists" });
				return;
			}

			const options = await authPasskeyInternals.generateRegistrationOptions({
				rpName: WEBAUTHN_RP_NAME,
				rpID: WEBAUTHN_RP_ID,
				userName: email,
				attestationType: "none",
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			});

			const flowToken = await makeFlowToken(options.challenge, {
				inviteToken: token,
			});
			respond(ctx, oak.Status.OK, { options, flowToken });
		} catch (err) {
			logger.error("invite/register/options error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	authRouter.post("/passkey/invite/register/verify", async (ctx) => {
		try {
			const { email: rawEmail, credential, flowToken } = await getBodyJson(ctx);
			const email = parseEmail(rawEmail);
			if (!email) {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
				return;
			}

			const { challenge: expectedChallenge, claims } =
				await readFlowToken(flowToken);
			const inviteToken = claims.inviteToken;
			if (typeof inviteToken !== "string" || inviteToken.length === 0) {
				respond(ctx, oak.Status.BadRequest, { error: "no invite token" });
				return;
			}

			const verification =
				await authPasskeyInternals.verifyRegistrationResponse({
					response: credential as RegistrationResponseJSON,
					expectedChallenge,
					expectedOrigin: WEBAUTHN_ORIGIN,
					expectedRPID: WEBAUTHN_RP_ID,
				});

			if (!verification.verified || !verification.registrationInfo) {
				respond(ctx, oak.Status.BadRequest, { error: "verification failed" });
				return;
			}

			const stored = credentialToStored(
				verification as {
					registrationInfo: NonNullable<typeof verification.registrationInfo>;
				},
				(credential as RegistrationResponseJSON).response.transports,
			);

			let user: UserRecord;
			let vaultId: string;
			try {
				const registered = await authPasskeyInternals.registerInvitee(
					email,
					stored,
					inviteToken,
				);
				user = registered.user;
				vaultId = registered.vaultId;
			} catch (err) {
				const msg = (err as Error).message;
				if (msg === "invite_already_redeemed") {
					respond(ctx, oak.Status.Conflict, {
						error: "invite_already_redeemed",
					});
					return;
				}
				if (msg === "invite_not_found") {
					respond(ctx, oak.Status.NotFound, { error: "invite not found" });
					return;
				}
				if (err instanceof VaultFullError) {
					respond(ctx, oak.Status.Conflict, { error: "vault_full" });
					return;
				}
				throw err;
			}

			const result = await authPasskeyInternals.authenticateAndRespond(
				ctx,
				"passkey",
				email,
				user.id,
				vaultId,
			);
			respond(ctx, oak.Status.OK, result);
		} catch (err) {
			logger.error("invite/register/verify error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});
}
