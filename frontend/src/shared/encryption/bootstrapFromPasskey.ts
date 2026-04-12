import type { StartRegistrationOpts } from "@simplewebauthn/browser";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import type { SyncConfig } from "../../entities/Config";
import { getCurrentHost } from "../../utils/Utils";

type RegistrationOptionsJSON = StartRegistrationOpts["optionsJSON"];
type AuthenticationOptionsJSON = Parameters<
	typeof startAuthentication
>[0]["optionsJSON"];

type FlowResponse<O> = { options: O; flowToken: string };

type AuthResponse = {
	authenticated: boolean;
	database: string;
	accessToken: string;
};

type InviteInfoResponse = {
	valid: boolean;
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
	if (!response.ok) {
		const err = await response.json();
		throw new Error(err.error || "request failed");
	}
	return (await response.json()) as T;
};

function toSyncConfig(auth: AuthResponse): SyncConfig {
	return {
		url: `${getCurrentHost()}/db/${auth.database}`,
		username: "JWT",
		password: auth.accessToken,
		enabled: true,
	};
}

export const registerPasskey = async (email: string): Promise<SyncConfig> => {
	const { options, flowToken } = await post<
		FlowResponse<RegistrationOptionsJSON>
	>("/api/auth/passkey/register/options", { email });
	const credential = await startRegistration({ optionsJSON: options });
	const auth = await post<AuthResponse>("/api/auth/passkey/register/verify", {
		email,
		credential,
		flowToken,
	});
	return toSyncConfig(auth);
};

export const loginPasskey = async (email: string): Promise<SyncConfig> => {
	const { options, flowToken } = await post<
		FlowResponse<AuthenticationOptionsJSON>
	>("/api/auth/passkey/login/options", { email });
	const credential = await startAuthentication({ optionsJSON: options });
	const auth = await post<AuthResponse>("/api/auth/passkey/login/verify", {
		email,
		credential,
		flowToken,
	});
	return toSyncConfig(auth);
};

export const fetchPasskeyAuthState = async (): Promise<SyncConfig | null> => {
	try {
		const response = await fetch("/api/auth/couch", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({}),
		});
		if (!response.ok) return null;
		const auth = (await response.json()) as AuthResponse;
		if (!auth.authenticated || !auth.database || !auth.accessToken) return null;
		return toSyncConfig(auth);
	} catch {
		return null;
	}
};

export const getInviteInfo = async (
	token: string,
): Promise<InviteInfoResponse | null> => {
	try {
		return await post<InviteInfoResponse>("/api/auth/passkey/invite/info", {
			token,
		});
	} catch {
		return null;
	}
};

export const registerViaInvite = async (
	token: string,
	email: string,
): Promise<SyncConfig> => {
	const { options, flowToken } = await post<
		FlowResponse<RegistrationOptionsJSON>
	>("/api/auth/passkey/invite/register/options", { token, email });
	const credential = await startRegistration({ optionsJSON: options });
	const auth = await post<AuthResponse>(
		"/api/auth/passkey/invite/register/verify",
		{ email, credential, flowToken },
	);
	return toSyncConfig(auth);
};

export const createInviteLink = async (): Promise<string> => {
	const result = await post<{ inviteUrl: string }>(
		"/api/auth/passkey/invite/create",
		{},
	);
	return result.inviteUrl;
};
