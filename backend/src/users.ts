import {
	dbApi,
	dbCreate,
	dbExists,
	dbSecurityAddMember,
	prepareUserDatabase,
} from "./couchdb.ts";
import type { AuthenticatorTransportFuture } from "./deps.ts";
import { Logger } from "./logger.ts";

const logger = Logger("users");

const USERS_DB = "moneeey_users";

export type StoredCredential = {
	credentialId: string;
	publicKey: string;
	counter: number;
	transports?: AuthenticatorTransportFuture[];
	createdAt: string;
};

export type StoredInvite = {
	token: string;
	createdAt: string;
	redeemedBy: string | null;
};

export type UserDocument = {
	_id: string;
	_rev?: string;
	email: string;
	database: string;
	credentials: StoredCredential[];
	invites: StoredInvite[];
	createdAt: string;
};

async function sha384(value: string) {
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(value);
	const hashBuffer = await crypto.subtle.digest("SHA-384", dataBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function userDocId(email: string) {
	return sha384(email).then((hash) => `user:${hash}`);
}

export async function ensureUsersDbExists() {
	if (!(await dbExists(USERS_DB))) {
		logger.info("creating users database", { db: USERS_DB });
		await dbCreate(USERS_DB);
	}
}

export async function getUserByEmail(
	email: string,
): Promise<UserDocument | null> {
	const docId = await userDocId(email);
	const resp = await dbApi("GET", `${USERS_DB}/${docId}`);
	if (!resp || resp.status !== 200) return null;
	return (await resp.json()) as UserDocument;
}

export async function createUser(
	email: string,
	database: string,
	credential: StoredCredential,
): Promise<UserDocument> {
	const docId = await userDocId(email);
	const doc: UserDocument = {
		_id: docId,
		email,
		database,
		credentials: [credential],
		invites: [],
		createdAt: new Date().toISOString(),
	};
	const resp = await dbApi("PUT", `${USERS_DB}/${docId}`, doc);
	if (!resp || resp.status !== 201) {
		const body = resp ? await resp.text() : "no response";
		throw new Error(`failed to create user: ${body}`);
	}
	const result = await resp.json();
	doc._rev = result.rev;
	return doc;
}

async function updateUser(user: UserDocument): Promise<UserDocument> {
	const resp = await dbApi("PUT", `${USERS_DB}/${user._id}`, user);
	if (!resp || resp.status !== 201) {
		const body = resp ? await resp.text() : "no response";
		throw new Error(`failed to update user: ${body}`);
	}
	const result = await resp.json();
	user._rev = result.rev;
	return user;
}

export async function addCredential(
	email: string,
	credential: StoredCredential,
): Promise<UserDocument> {
	const user = await getUserByEmail(email);
	if (!user) throw new Error("user not found");
	user.credentials.push(credential);
	return updateUser(user);
}

export async function updateCredentialCounter(
	email: string,
	credentialId: string,
	newCounter: number,
): Promise<void> {
	const user = await getUserByEmail(email);
	if (!user) throw new Error("user not found");
	const cred = user.credentials.find((c) => c.credentialId === credentialId);
	if (!cred) throw new Error("credential not found");
	cred.counter = newCounter;
	await updateUser(user);
}

export async function createInvite(email: string): Promise<string> {
	const user = await getUserByEmail(email);
	if (!user) throw new Error("user not found");
	const tokenBytes = new Uint8Array(32);
	crypto.getRandomValues(tokenBytes);
	const token = Array.from(tokenBytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	user.invites.push({
		token,
		createdAt: new Date().toISOString(),
		redeemedBy: null,
	});
	await updateUser(user);
	return token;
}

export async function findInvite(
	token: string,
): Promise<{ user: UserDocument; invite: StoredInvite } | null> {
	const resp = await dbApi("POST", `${USERS_DB}/_find`, {
		selector: { invites: { $elemMatch: { token } } },
		limit: 1,
	});
	if (!resp || resp.status !== 200) return null;
	const result = await resp.json();
	const docs = result.docs as UserDocument[];
	if (docs.length === 0) return null;
	const user = docs[0];
	const invite = user.invites.find((i) => i.token === token);
	if (!invite || invite.redeemedBy) return null;
	return { user, invite };
}

export async function redeemInvite(
	token: string,
	redeemerEmail: string,
): Promise<string> {
	const found = await findInvite(token);
	if (!found) throw new Error("invite not found or already redeemed");
	const { user, invite } = found;
	invite.redeemedBy = redeemerEmail;
	await updateUser(user);
	await dbSecurityAddMember(user.database, redeemerEmail);
	return user.database;
}

export async function generateDatabaseName(email: string): Promise<string> {
	const hash = await sha384(`passkey:${email}`);
	return `passkey_${hash}`;
}

export async function createUserWithDatabase(
	email: string,
	credential: StoredCredential,
): Promise<UserDocument> {
	const database = await generateDatabaseName(email);
	await prepareUserDatabase(database, email);
	return createUser(email, database, credential);
}

export async function createUserForInvite(
	email: string,
	database: string,
	credential: StoredCredential,
): Promise<UserDocument> {
	await dbSecurityAddMember(database, email);
	return createUser(email, database, credential);
}

export const usersInternals = {
	sha384,
	userDocId,
	updateUser,
};
