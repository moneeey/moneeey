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
 * `ManagementStore` also delegates to these helpers so there is a single
 * source of truth for the magic-link wire format.
 */

import type { SyncConfig } from "../../entities/Config";
import { getCurrentHost } from "../../utils/Utils";
import { encryptionError } from "./encryptedPouch";

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 10_000;

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

/** Single-shot check for whether the user's magic-link click has landed
 * on the backend. `ManagementStore` uses this for its internal polling;
 * the gate's cancellable poll below is built on top of it. */
export const fetchMagicLinkState = async (): Promise<SyncConfig | null> => {
	const { authenticated, database, accessToken } =
		await post<MagicCouchResponse>("/api/auth/couch", {});
	if (!authenticated || !database || !accessToken) {
		return null;
	}
	return {
		url: `${getCurrentHost()}/db/${database}`,
		username: "JWT",
		password: accessToken,
		enabled: true,
	};
};

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
	new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(encryptionError("magic_link_cancelled"));
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(encryptionError("magic_link_cancelled"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});

export type MagicLinkPollOptions = {
	/** Cancellation hook wired to the gate's "Cancel" button. */
	signal?: AbortSignal;
	/** Called once per polling round so the UI can render a countdown /
	 * "attempt N of M" progress indicator. */
	onAttempt?: (attempt: number, maxAttempts: number) => void;
};

/**
 * Polls `/api/auth/couch` until it returns `authenticated: true` with a
 * non-empty database name and access token, or until the max attempt count
 * is exceeded, or until `signal` is aborted. When the user clicks the
 * magic-link email, the backend sets an httpOnly cookie and subsequent
 * polls flip to authenticated.
 *
 * Total budget: `MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS` = 30 × 10 s = 300 s.
 * That's long enough for the user to switch to their email client, locate
 * the magic-link message (including spam-folder fishing), and click
 * through, while still surfacing stuck flows before the tab feels dead.
 */
export const pollForMagicLinkAuth = async (
	options: MagicLinkPollOptions = {},
): Promise<SyncConfig> => {
	const { signal, onAttempt } = options;
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
		if (signal?.aborted) {
			throw encryptionError("magic_link_cancelled");
		}
		onAttempt?.(attempt + 1, MAX_POLL_ATTEMPTS);
		const remote = await fetchMagicLinkState();
		if (remote) {
			return remote;
		}
		if (attempt < MAX_POLL_ATTEMPTS - 1) {
			await wait(POLL_INTERVAL_MS, signal);
		}
	}
	throw encryptionError("magic_link_timeout");
};
