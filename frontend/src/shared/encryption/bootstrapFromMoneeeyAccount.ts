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

export const startMagicLink = async (email: string): Promise<boolean> => {
	const { sent } = await post<MagicSendResponse>("/api/auth/magic/send", {
		email,
	});
	return Boolean(sent);
};

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
	signal?: AbortSignal;
	onAttempt?: (attempt: number, maxAttempts: number) => void;
};

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
