import { getStorage } from "./data/storage_singleton.ts";
import { createVaultForUser, getVaultsByUser } from "./data/vaults.ts";
import { oak } from "./deps.ts";
import { authJwt, sessionJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";

const logger = Logger("auth_session");

const AUTH_COOKIE_TTL = "48h";
const SESSION_TOKEN_TTL = "36h";

type UserId = {
	strategy: string;
	userId: string;
	email: string;
};

async function resolvePrimaryVaultId(userId: string): Promise<string> {
	const storage = getStorage();
	const vaults = await getVaultsByUser(storage, userId);
	if (vaults.length > 0) return vaults[0].id;
	const vault = await createVaultForUser(storage, userId);
	return vault.id;
}

export const authSessionInternals = {
	resolvePrimaryVaultId,
};

export async function setAuthCookie(
	ctx: oak.Context,
	strategy: string,
	email: string,
	userId: string,
): Promise<string> {
	const authToken = await authJwt.generate(
		email,
		{ strategy, userId },
		AUTH_COOKIE_TTL,
	);
	ctx.cookies.set("authToken", authToken, { httpOnly: true });
	return authToken;
}

export async function authenticateAndRespond(
	ctx: oak.Context,
	strategy: string,
	email: string,
	userId: string,
	vaultId: string,
): Promise<{ authenticated: true; vaultId: string; sessionToken: string }> {
	await setAuthCookie(ctx, strategy, email, userId);
	const sessionToken = await sessionJwt.generate(
		email,
		{ vaultId, userId },
		SESSION_TOKEN_TTL,
	);
	return { authenticated: true, vaultId, sessionToken };
}

async function loadSession({ strategy, email, userId }: UserId) {
	if (!email || !userId) return { authenticated: false as const };
	const vaultId = await authSessionInternals.resolvePrimaryVaultId(userId);
	const sessionToken = await sessionJwt.generate(
		email,
		{ vaultId, userId },
		SESSION_TOKEN_TTL,
	);
	logger.info("session loaded", { strategy, email, vaultId });
	return { authenticated: true as const, vaultId, sessionToken };
}

export function setupSession(authRouter: oak.Router) {
	authRouter.post("/session", async (ctx: oak.Context) => {
		try {
			const authToken = await ctx.cookies.get("authToken");
			if (!authToken || authToken.length === 0) {
				ctx.response.body = JSON.stringify({ authenticated: false });
				ctx.response.status = oak.Status.Unauthorized;
				return;
			}
			const validated = await authJwt.validate(authToken);
			const email = validated.payload.sub || "";
			const strategy = String(validated.payload.strategy || "");
			const userId = String(validated.payload.userId || "");
			ctx.response.body = JSON.stringify(
				await loadSession({ strategy, email, userId }),
			);
		} catch (err) {
			logger.error("/session error", { err });
			ctx.response.body = JSON.stringify({ error: "ops" });
			ctx.response.status = oak.Status.BadRequest;
		}
	});

	authRouter.post("/logout", (ctx: oak.Context) => {
		try {
			ctx.cookies.delete("authToken");
			ctx.response.body = JSON.stringify({ authenticated: false });
		} catch (err) {
			logger.error("/logout error", { err });
			ctx.response.body = JSON.stringify({ error: "ops" });
			ctx.response.status = oak.Status.BadRequest;
		}
	});
}
