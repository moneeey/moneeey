/**
 * Gate-time magic-link bootstrap helpers, extracted from `ManagementStore`
 * so they can run before `MoneeeyStore` (and therefore `PersistenceStore`)
 * exists. The gate uses these to:
 *
 *   1. POST /api/auth/magic/send with the user's email address.
 *   2. Poll /api/auth/couch until the backend reports authenticated
 *      (the user clicked the magic-link email in another tab).
 *   3. Return a ready-to-use `SyncConfig` pointing at the user's per-user
 *      CouchDB database, which the gate feeds to a one-shot `db.sync`.
 *
 * `ManagementStore` continues to exist post-unlock — it drives live sync
 * from within the decrypted store — and internally delegates to these
 * helpers so there's only one place where the magic-link wire format is
 * defined.
 */

import type { SyncConfig } from "../../entities/Config";
import { getCurrentHost } from "../../utils/Utils";

const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 10_000;
const POLL_BACKOFF_MS = 4_000;

type MagicSendResponse = { sent?: string };

type MagicCouchResponse = {
	authenticated: boolean;
	database: string;
	accessToken: string;
};

const post = async <T>(url: string, body: object): Promise<T> => {
	const response = await fetch(url, {
		method: "POST",
		body: JSON.stringify(body),
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	});
	return (await response.json()) as T;
};

/** Triggers the magic-link email. Returns true if the backend reports it
 * queued the email. Does not wait for the user to click the link. */
export const startMagicLink = async (email: string): Promise<boolean> => {
	const { sent } = await post<MagicSendResponse>("/api/auth/magic/send", {
		email,
	});
	return Boolean(sent);
};

const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls `/api/auth/couch` until it returns `authenticated: true` with a
 * non-empty database name and access token, or until the max attempt count
 * is exceeded. When the user clicks the magic-link email, the backend sets
 * an httpOnly cookie and subsequent polls flip to authenticated.
 *
 * Returns a `SyncConfig` ready to pass to `db.sync(remote.url, ...)`.
 */
export const pollForMagicLinkAuth = async (): Promise<SyncConfig> => {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
		const { authenticated, database, accessToken } =
			await post<MagicCouchResponse>("/api/auth/couch", {});
		if (authenticated && database && accessToken) {
			return {
				url: `${getCurrentHost()}/db/${database}`,
				username: "JWT",
				password: accessToken,
				enabled: true,
			};
		}
		if (attempt < MAX_POLL_ATTEMPTS - 1) {
			await wait(POLL_INTERVAL_MS + attempt * POLL_BACKOFF_MS);
		}
	}
	throw new Error("magic_link_timeout");
};
