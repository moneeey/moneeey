import type express from "express";
import { getStorage } from "./data/storage_singleton.ts";
import { getUserById } from "./data/users.ts";
import {
	createVaultForUser,
	defaultVaultNameFor,
	getVaultsByUser,
} from "./data/vaults.ts";
import { authJwt, sessionJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";

const logger = Logger("auth_session");

const AUTH_COOKIE_TTL = "48h";
const SESSION_TOKEN_TTL = "36h";

type UserId = {
	strategy: string;
	userId: string;
};

export async function resolvePrimaryVaultId(userId: string): Promise<string> {
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
	res: express.Response,
	strategy: string,
	userId: string,
): Promise<string> {
	const authToken = await authJwt.generate(
		userId,
		{ strategy, userId },
		AUTH_COOKIE_TTL,
	);
	res.cookie("authToken", authToken, { httpOnly: true });
	return authToken;
}

export async function authenticateAndRespond(
	res: express.Response,
	strategy: string,
	userId: string,
	vaultId: string,
): Promise<{ authenticated: true; vaultId: string; sessionToken: string }> {
	await setAuthCookie(res, strategy, userId);
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

export function setupSession(authRouter: express.Router) {
	authRouter.post("/session", async (req, res) => {
		try {
			const authToken = req.cookies.authToken;
			if (!authToken || authToken.length === 0) {
				res.status(401).json({ authenticated: false });
				return;
			}
			const validated = await authJwt.validate(authToken);
			const strategy = String(validated.payload.strategy || "");
			const userId = String(validated.payload.userId || "");
			res.json(await loadSession({ strategy, userId }));
		} catch (err) {
			logger.error("/session error", { err });
			res.status(400).json({ error: "ops" });
		}
	});

	authRouter.post("/logout", (_req, res) => {
		try {
			res.clearCookie("authToken");
			res.json({ authenticated: false });
		} catch (err) {
			logger.error("/logout error", { err });
			res.status(400).json({ error: "ops" });
		}
	});
}
