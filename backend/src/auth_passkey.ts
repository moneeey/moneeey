import { authenticateAndRespond } from "./auth_couch.ts";
import {
	APP_URL,
	WEBAUTHN_ORIGIN,
	WEBAUTHN_RP_ID,
	WEBAUTHN_RP_NAME,
} from "./config.ts";
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
import {
	createInvite,
	createUserForInvite,
	createUserWithDatabase,
	findInvite,
	getUserByEmail,
	redeemInvite,
	updateCredentialCounter,
} from "./users.ts";
import type { StoredCredential } from "./users.ts";

const logger = Logger("passkey");

export const authPasskeyInternals = {
	getUserByEmail,
	createUserWithDatabase,
	createUserForInvite,
	createInvite,
	findInvite,
	redeemInvite,
	updateCredentialCounter,
	generateRegistrationOptions,
	generateAuthenticationOptions,
	verifyRegistrationResponse,
	verifyAuthenticationResponse,
	authenticateAndRespond,
};

const getBodyJson = async (ctx: oak.Context) => {
	return await ctx.request.body({ type: "json" }).value;
};

// Permissive but bounded: at least one char before @, at least one dot in the
// domain, no whitespace. Final correctness is enforced by the WebAuthn ceremony
// and downstream usage; we mainly want to reject obvious garbage.
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
			const {
				email: rawEmail,
				credential,
				flowToken,
			} = await getBodyJson(ctx);
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
			const user = await authPasskeyInternals.createUserWithDatabase(
				email,
				stored,
			);
			const result = await authPasskeyInternals.authenticateAndRespond(
				ctx,
				"passkey",
				email,
				`passkey:${email}`,
				user.database,
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
			const {
				email: rawEmail,
				credential,
				flowToken,
			} = await getBodyJson(ctx);
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

			const result = await authPasskeyInternals.authenticateAndRespond(
				ctx,
				"passkey",
				email,
				`passkey:${email}`,
				user.database,
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
				const token = await authPasskeyInternals.createInvite(email);
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
			const {
				email: rawEmail,
				credential,
				flowToken,
			} = await getBodyJson(ctx);
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

			let database: string;
			try {
				database = await authPasskeyInternals.redeemInvite(inviteToken, email);
			} catch (err) {
				const msg = (err as Error).message;
				if (msg === "invite_already_redeemed") {
					respond(ctx, oak.Status.Conflict, { error: "invite_already_redeemed" });
					return;
				}
				if (msg === "invite_not_found") {
					respond(ctx, oak.Status.NotFound, { error: "invite not found" });
					return;
				}
				throw err;
			}
			await authPasskeyInternals.createUserForInvite(email, database, stored);

			const result = await authPasskeyInternals.authenticateAndRespond(
				ctx,
				"passkey",
				email,
				`passkey:${email}`,
				database,
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
