import { getStorage } from "./data/storage_singleton.ts";
import { getUserById } from "./data/users.ts";
import {
	createVaultForUser,
	defaultVaultNameFor,
	getVaultsByUser,
} from "./data/vaults.ts";
import { oak } from "./deps.ts";
import { authJwt, sessionJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";

const logger = Logger("auth_session");

const AUTH_COOKIE_TTL = "48h";
const SESSION_TOKEN_TTL = "36h";

type UserId = {
	strategy: string;
	userId: string;
};

async function resolvePrimaryVaultId(userId: string): Promise<string> {
	const storage = getStorage();
	const vaults = await getVaultsByUser(storage, userId);
	if (vaults.length > 0) return vaults[0].id;
	const user = await getUserById(storage, userId);
	const name = defaultVaultNameFor(user?.displayName ?? "");
	const vault = await createVaultForUser(storage, userId, name);
	return vault.id;
}

export const authSessionInternals = {
	resolvePrimaryVaultId,
};

export async function setAuthCookie(
	ctx: oak.Context,
	strategy: string,
	userId: string,
): Promise<string> {
	const authToken = await authJwt.generate(
		userId,
		{ strategy, userId },
		AUTH_COOKIE_TTL,
	);
	ctx.cookies.set("authToken", authToken, { httpOnly: true });
	return authToken;
}

export async function authenticateAndRespond(
	ctx: oak.Context,
	strategy: string,
	userId: string,
	vaultId: string,
): Promise<{ authenticated: true; vaultId: string; sessionToken: string }> {
	await setAuthCookie(ctx, strategy, userId);
	const sessionToken = await sessionJwt.generate(
		userId,
		{ vaultId, userId },
		SESSION_TOKEN_TTL,
	);
	return { authenticated: true, vaultId, sessionToken };
}

async function loadSession({ strategy, userId }: UserId) {
	if (!userId) return { authenticated: false as const };
	const vaultId = await authSessionInternals.resolvePrimaryVaultId(userId);
	const sessionToken = await sessionJwt.generate(
		userId,
		{ vaultId, userId },
		SESSION_TOKEN_TTL,
	);
	logger.info("session loaded", { strategy, userId, vaultId });
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
			const strategy = String(validated.payload.strategy || "");
			const userId = String(validated.payload.userId || "");
			ctx.response.body = JSON.stringify(
				await loadSession({ strategy, userId }),
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
