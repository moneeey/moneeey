import type express from "express";
import {
	authenticateAndRespond,
	resolvePrimaryVaultId,
} from "./auth_session.ts";
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
import type { StoredPasskey, UserRecord } from "./data/types.ts";
import {
	addPasskey as dataAddPasskey,
	createUser as dataCreateUser,
	getUserByCredentialId as dataGetUserByCredentialId,
	updatePasskeyCounter as dataUpdatePasskeyCounter,
} from "./data/users.ts";
import {
	VaultFullError,
	createVaultForUser as dataCreateVaultForUser,
	getVaultsByUser as dataGetVaultsByUser,
	defaultVaultNameFor,
} from "./data/vaults.ts";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
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

const MAX_DISPLAY_NAME_LENGTH = 64;

async function createUserVaultAndPasskey(
	displayName: string,
	credential: Omit<StoredPasskey, "userId">,
): Promise<{ user: UserRecord; vaultId: string; passkey: StoredPasskey }> {
	const storage = getStorage();
	const user = await dataCreateUser(storage, displayName);
	const passkey = await dataAddPasskey(storage, user.id, credential);
	const vault = await dataCreateVaultForUser(
		storage,
		user.id,
		defaultVaultNameFor(displayName),
	);
	return { user, vaultId: vault.id, passkey };
}

async function createUserWithInviteAndPasskey(
	displayName: string,
	credential: Omit<StoredPasskey, "userId">,
	inviteToken: string,
): Promise<{ user: UserRecord; vaultId: string; passkey: StoredPasskey }> {
	const storage = getStorage();
	const user = await dataCreateUser(storage, displayName);
	const passkey = await dataAddPasskey(storage, user.id, credential);
	const vaultId = await dataRedeemInvite(storage, inviteToken, user.id);
	return { user, vaultId, passkey };
}

async function getPrimaryVaultId(userId: string): Promise<string | null> {
	const vaults = await dataGetVaultsByUser(getStorage(), userId);
	return vaults[0]?.id ?? null;
}

async function createInviteForOwner(
	ownerUserId: string,
): Promise<{ token: string; vaultId: string }> {
	const vaultId = await getPrimaryVaultId(ownerUserId);
	if (!vaultId) throw new Error("owner has no vault");
	const token = await dataCreateInvite(getStorage(), ownerUserId, vaultId);
	return { token, vaultId };
}

export const authPasskeyInternals = {
	getUserByCredentialId: (credentialId: string) =>
		dataGetUserByCredentialId(getStorage(), credentialId),
	createUserVaultAndPasskey,
	createUserWithInviteAndPasskey,
	getPrimaryVaultId,
	resolvePrimaryVaultId,
	createInviteForOwner,
	findInvite: (token: string) => dataFindInvite(getStorage(), token),
	acceptInviteForUser: async (userId: string, token: string) => ({
		vaultId: await dataRedeemInvite(getStorage(), token, userId),
	}),
	updatePasskeyCounter: (credentialId: string, counter: number) =>
		dataUpdatePasskeyCounter(getStorage(), credentialId, counter),
	generateRegistrationOptions,
	generateAuthenticationOptions,
	verifyRegistrationResponse,
	verifyAuthenticationResponse,
	authenticateAndRespond,
};

const getBodyJson = async (req: express.Request) => {
	return (req.body ?? {}) as Record<string, unknown>;
};

const parseDisplayName = (raw: unknown): string | null => {
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	if (trimmed.length === 0) return null;
	if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) return null;
	return trimmed;
};

function respond(res: express.Response, status: number, body: object) {
	res.status(status).json(body);
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
): Omit<StoredPasskey, "userId"> {
	const { credential } = verification.registrationInfo;
	return {
		credentialId: credential.id,
		publicKey: btoa(String.fromCharCode(...credential.publicKey)),
		counter: credential.counter,
		transports: transports as StoredPasskey["transports"],
		createdAt: new Date().toISOString(),
	};
}

export function setupPasskey(authRouter: express.Router) {
	authRouter.post("/passkey/register/options", async (req, res) => {
		try {
			const { displayName: rawName } = await getBodyJson(req);
			const displayName = parseDisplayName(rawName);
			if (!displayName) {
				respond(res, 400, { error: "bad display name" });
				return;
			}

			const options = await authPasskeyInternals.generateRegistrationOptions({
				rpName: WEBAUTHN_RP_NAME,
				rpID: WEBAUTHN_RP_ID,
				userName: displayName,
				userDisplayName: displayName,
				attestationType: "none",
				authenticatorSelection: {
					residentKey: "required",
					userVerification: "preferred",
				},
			});

			const flowToken = await makeFlowToken(options.challenge, { displayName });
			respond(res, 200, { options, flowToken });
		} catch (err) {
			logger.error("register/options error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/register/verify", async (req, res) => {
		try {
			const { credential, flowToken } = await getBodyJson(req);

			const { challenge: expectedChallenge, claims } =
				await readFlowToken(flowToken);
			const displayName = parseDisplayName(claims.displayName);
			if (!displayName) {
				respond(res, 400, { error: "bad display name" });
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
				respond(res, 400, { error: "verification failed" });
				return;
			}

			const stored = credentialToStored(
				verification as {
					registrationInfo: NonNullable<typeof verification.registrationInfo>;
				},
				(credential as RegistrationResponseJSON).response.transports,
			);
			const { user, vaultId } =
				await authPasskeyInternals.createUserVaultAndPasskey(
					displayName,
					stored,
				);
			const result = await authPasskeyInternals.authenticateAndRespond(
				res,
				"passkey",
				user.id,
				vaultId,
			);
			respond(res, 200, result);
		} catch (err) {
			logger.error("register/verify error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/login/options", async (_req, res) => {
		try {
			const options = await authPasskeyInternals.generateAuthenticationOptions({
				rpID: WEBAUTHN_RP_ID,
				userVerification: "preferred",
			});

			const flowToken = await makeFlowToken(options.challenge);
			respond(res, 200, { options, flowToken });
		} catch (err) {
			logger.error("login/options error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/login/verify", async (req, res) => {
		try {
			const { credential, flowToken } = await getBodyJson(req);

			const { challenge: expectedChallenge } = await readFlowToken(flowToken);
			const authResponse = credential as AuthenticationResponseJSON;
			const lookup = await authPasskeyInternals.getUserByCredentialId(
				authResponse.id,
			);
			if (!lookup) {
				respond(res, 400, { error: "credential not found" });
				return;
			}
			const { user, passkey } = lookup;

			const verification =
				await authPasskeyInternals.verifyAuthenticationResponse({
					response: authResponse,
					expectedChallenge,
					expectedOrigin: WEBAUTHN_ORIGIN,
					expectedRPID: WEBAUTHN_RP_ID,
					credential: {
						id: passkey.credentialId,
						publicKey: new Uint8Array(
							atob(passkey.publicKey)
								.split("")
								.map((c) => c.charCodeAt(0)),
						),
						counter: passkey.counter,
						transports: passkey.transports,
					},
				});

			if (!verification.verified) {
				respond(res, 400, { error: "verification failed" });
				return;
			}

			await authPasskeyInternals.updatePasskeyCounter(
				passkey.credentialId,
				verification.authenticationInfo.newCounter,
			);

			const vaultId = await authPasskeyInternals.resolvePrimaryVaultId(user.id);

			const result = await authPasskeyInternals.authenticateAndRespond(
				res,
				"passkey",
				user.id,
				vaultId,
			);
			respond(res, 200, result);
		} catch (err) {
			logger.error("login/verify error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/invite/create", async (req, res) => {
		try {
			const authToken = req.cookies.authToken;
			if (!authToken) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const validated = await authJwt.validate(authToken);
			const userId = String(validated.payload.userId || "");
			if (!userId) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}

			try {
				const { token } =
					await authPasskeyInternals.createInviteForOwner(userId);
				const inviteUrl = `${APP_URL}/#/invite/${token}`;
				respond(res, 200, { inviteUrl, token });
			} catch (err) {
				if ((err as Error).message === "invite_quota_exceeded") {
					respond(res, 429, { error: "invite_quota_exceeded" });
					return;
				}
				throw err;
			}
		} catch (err) {
			logger.error("invite/create error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/invite/accept", async (req, res) => {
		try {
			const authToken = req.cookies.authToken;
			if (!authToken) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const validated = await authJwt.validate(authToken);
			const userId = String(validated.payload.userId || "");
			if (!userId) {
				respond(res, 401, { error: "not authenticated" });
				return;
			}
			const { token } = await getBodyJson(req);
			if (typeof token !== "string" || token.length === 0) {
				respond(res, 400, { error: "missing token" });
				return;
			}
			try {
				const { vaultId } = await authPasskeyInternals.acceptInviteForUser(
					userId,
					token,
				);
				respond(res, 200, { vaultId });
			} catch (err) {
				const msg = (err as Error).message;
				if (msg === "invite_not_found") {
					respond(res, 404, { error: "invite not found" });
					return;
				}
				if (msg === "invite_already_redeemed") {
					respond(res, 409, { error: "invite_already_redeemed" });
					return;
				}
				if (err instanceof VaultFullError) {
					respond(res, 409, { error: "vault_full" });
					return;
				}
				throw err;
			}
		} catch (err) {
			logger.error("invite/accept error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/invite/info", async (req, res) => {
		try {
			const { token } = await getBodyJson(req);
			const found = await authPasskeyInternals.findInvite(token as string);
			if (!found) {
				respond(res, 404, { error: "invite not found" });
				return;
			}
			respond(res, 200, { valid: true });
		} catch (err) {
			logger.error("invite/info error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/invite/register/options", async (req, res) => {
		try {
			const { token, displayName: rawName } = await getBodyJson(req);
			const displayName = parseDisplayName(rawName);
			if (!displayName) {
				respond(res, 400, { error: "bad display name" });
				return;
			}

			const found = await authPasskeyInternals.findInvite(token as string);
			if (!found) {
				respond(res, 404, { error: "invite not found" });
				return;
			}

			const options = await authPasskeyInternals.generateRegistrationOptions({
				rpName: WEBAUTHN_RP_NAME,
				rpID: WEBAUTHN_RP_ID,
				userName: displayName,
				userDisplayName: displayName,
				attestationType: "none",
				authenticatorSelection: {
					residentKey: "required",
					userVerification: "preferred",
				},
			});

			const flowToken = await makeFlowToken(options.challenge, {
				inviteToken: token as string,
				displayName,
			});
			respond(res, 200, { options, flowToken });
		} catch (err) {
			logger.error("invite/register/options error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});

	authRouter.post("/passkey/invite/register/verify", async (req, res) => {
		try {
			const { credential, flowToken } = await getBodyJson(req);

			const { challenge: expectedChallenge, claims } =
				await readFlowToken(flowToken);
			const inviteToken = claims.inviteToken;
			if (typeof inviteToken !== "string" || inviteToken.length === 0) {
				respond(res, 400, { error: "no invite token" });
				return;
			}
			const displayName = parseDisplayName(claims.displayName);
			if (!displayName) {
				respond(res, 400, { error: "bad display name" });
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
				respond(res, 400, { error: "verification failed" });
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
				const registered =
					await authPasskeyInternals.createUserWithInviteAndPasskey(
						displayName,
						stored,
						inviteToken,
					);
				user = registered.user;
				vaultId = registered.vaultId;
			} catch (err) {
				const msg = (err as Error).message;
				if (msg === "invite_already_redeemed") {
					respond(res, 409, { error: "invite_already_redeemed" });
					return;
				}
				if (msg === "invite_not_found") {
					respond(res, 404, { error: "invite not found" });
					return;
				}
				if (err instanceof VaultFullError) {
					respond(res, 409, { error: "vault_full" });
					return;
				}
				throw err;
			}

			const result = await authPasskeyInternals.authenticateAndRespond(
				res,
				"passkey",
				user.id,
				vaultId,
			);
			respond(res, 200, result);
		} catch (err) {
			logger.error("invite/register/verify error", { err });
			respond(res, 500, { error: "internal server error" });
		}
	});
}
