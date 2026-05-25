import type { AuthenticatorTransportFuture } from "../deps.ts";

export type StoredPasskey = {
	credentialId: string;
	userId: string;
	publicKey: string;
	counter: number;
	transports?: AuthenticatorTransportFuture[];
	createdAt: string;
};

export type UserRecord = {
	id: string;
	displayName: string;
	createdAt: string;
};

export type VaultRecord = {
	id: string;
	name: string;
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
