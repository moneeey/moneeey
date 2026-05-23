import type { AuthenticatorTransportFuture } from "../deps.ts";

export type StoredCredential = {
	credentialId: string;
	publicKey: string;
	counter: number;
	transports?: AuthenticatorTransportFuture[];
	createdAt: string;
};

export type UserRecord = {
	id: string;
	email: string;
	credentials: StoredCredential[];
	createdAt: string;
};

export type VaultRecord = {
	id: string;
	createdAt: string;
};

export type Membership = {
	userId: string;
	vaultId: string;
	role: "owner" | "member";
	addedAt: string;
};

export type InviteRecord = {
	tokenHash: string;
	vaultId: string;
	ownerUserId: string;
	expiresAt: string;
	redeemedBy: string | null;
	createdAt: string;
};
