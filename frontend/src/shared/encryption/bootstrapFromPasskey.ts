import type { StartRegistrationOpts } from "@simplewebauthn/browser";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import type { SyncConfig } from "../../entities/Config";

type RegistrationOptionsJSON = StartRegistrationOpts["optionsJSON"];
type AuthenticationOptionsJSON = Parameters<
	typeof startAuthentication
>[0]["optionsJSON"];

type FlowResponse<O> = { options: O; flowToken: string };

type AuthResponse = {
	authenticated: boolean;
	vaultId: string;
	sessionToken: string;
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
		vaultId: auth.vaultId,
		sessionToken: auth.sessionToken,
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
		const response = await fetch("/api/auth/session", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({}),
		});
		if (!response.ok) return null;
		const auth = (await response.json()) as AuthResponse;
		if (!auth.authenticated || !auth.vaultId || !auth.sessionToken) return null;
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

export const acceptInvite = async (
	token: string,
): Promise<{ vaultId: string }> => {
	return await post<{ vaultId: string }>("/api/auth/passkey/invite/accept", {
		token,
	});
};

export const createInviteLink = async (): Promise<string> => {
	const result = await post<{ inviteUrl: string }>(
		"/api/auth/passkey/invite/create",
		{},
	);
	return result.inviteUrl;
};

export type VaultMember = {
	userId: string;
	email: string;
	role: "owner" | "member";
	addedAt: string;
};

export type VaultMembersResponse = {
	members: VaultMember[];
	yourRole: "owner" | "member";
	yourUserId: string;
};

export const listVaultMembers = async (
	vaultId: string,
): Promise<VaultMembersResponse> =>
	await post<VaultMembersResponse>("/api/auth/vault/members", { vaultId });

export const kickVaultMember = async (
	vaultId: string,
	userId: string,
): Promise<void> => {
	await post("/api/auth/vault/kick", { vaultId, userId });
};

export const transferVaultOwnership = async (
	vaultId: string,
	userId: string,
): Promise<void> => {
	await post("/api/auth/vault/transfer", { vaultId, userId });
};

export type VaultListItem = {
	vaultId: string;
	role: "owner" | "member";
	createdAt: string;
};

export const listMyVaults = async (): Promise<VaultListItem[]> => {
	const result = await post<{ vaults: VaultListItem[] }>(
		"/api/auth/vaults/list",
		{},
	);
	return result.vaults;
};

export const selectVault = async (vaultId: string): Promise<SyncConfig> => {
	const auth = await post<AuthResponse>("/api/auth/vault/select", { vaultId });
	return toSyncConfig(auth);
};
