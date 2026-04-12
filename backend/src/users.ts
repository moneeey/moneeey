import {
	couchdbInternals,
	dbApi,
	dbSecurityAddMember,
	prepareUserDatabase,
} from "./couchdb.ts";
import type { AuthenticatorTransportFuture } from "./deps.ts";
import { Logger } from "./logger.ts";

const logger = Logger("users");

const USERS_DB = "moneeey_users";
const INVITE_INDEX_DDOC = "_design/invites";
const INVITE_INDEX_NAME = "by_invite_hash";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_QUOTA_PER_USER = 10;

export type StoredCredential = {
	credentialId: string;
	publicKey: string;
	counter: number;
	transports?: AuthenticatorTransportFuture[];
	createdAt: string;
};

export type StoredInvite = {
	tokenHash: string;
	createdAt: string;
	expiresAt: string;
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
	return await sha("SHA-384", value);
}

async function sha256(value: string) {
	return await sha("SHA-256", value);
}

async function sha(algo: "SHA-256" | "SHA-384", value: string) {
	const dataBuffer = new TextEncoder().encode(value);
	const hashBuffer = await crypto.subtle.digest(algo, dataBuffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function userDocId(email: string) {
	const hash = await sha384(email);
	return `user:${hash}`;
}

async function ensureInviteIndex() {
	const ddoc = {
		_id: INVITE_INDEX_DDOC,
		language: "query",
		views: {
			[INVITE_INDEX_NAME]: {
				map: {
					fields: { "invites.[].tokenHash": "asc" },
					partial_filter_selector: {},
				},
				reduce: "_count",
				options: {
					def: { fields: ["invites.[].tokenHash"] },
				},
			},
		},
	};
	const existing = await couchdbInternals.dbApi(
		"GET",
		`${USERS_DB}/${INVITE_INDEX_DDOC}`,
	);
	if (existing?.status === 200) return;
	const resp = await couchdbInternals.dbApi(
		"PUT",
		`${USERS_DB}/${INVITE_INDEX_DDOC}`,
		ddoc,
	);
	if (!resp || (resp.status !== 201 && resp.status !== 202)) {
		const body = resp ? await resp.text() : "no response";
		logger.error("failed to create invite index", { body });
	}
}

export async function ensureUsersDbExists() {
	if (!(await couchdbInternals.dbExists(USERS_DB))) {
		logger.info("creating users database", { db: USERS_DB });
		await couchdbInternals.dbCreate(USERS_DB);
		await couchdbInternals.dbSecurityApply(USERS_DB, []);
	}
	await ensureInviteIndex();
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
	if (resp?.status === 409) {
		throw new Error("conflict");
	}
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

function pruneInvites(invites: StoredInvite[]): StoredInvite[] {
	const now = Date.now();
	return invites.filter(
		(i) => i.redeemedBy === null && new Date(i.expiresAt).getTime() > now,
	);
}

export async function createInvite(email: string): Promise<string> {
	const user = await getUserByEmail(email);
	if (!user) throw new Error("user not found");
	user.invites = pruneInvites(user.invites);
	if (user.invites.length >= INVITE_QUOTA_PER_USER) {
		throw new Error("invite_quota_exceeded");
	}
	const tokenBytes = new Uint8Array(32);
	crypto.getRandomValues(tokenBytes);
	const token = Array.from(tokenBytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const tokenHash = await sha256(token);
	const now = Date.now();
	user.invites.push({
		tokenHash,
		createdAt: new Date(now).toISOString(),
		expiresAt: new Date(now + INVITE_TTL_MS).toISOString(),
		redeemedBy: null,
	});
	await updateUser(user);
	return token;
}

export async function findInvite(
	token: string,
): Promise<{ user: UserDocument; invite: StoredInvite } | null> {
	const tokenHash = await sha256(token);
	const resp = await dbApi("POST", `${USERS_DB}/_find`, {
		selector: { "invites.[].tokenHash": tokenHash },
		use_index: [INVITE_INDEX_DDOC.replace(/^_design\//, ""), INVITE_INDEX_NAME],
		limit: 1,
	});
	if (!resp || resp.status !== 200) return null;
	const result = await resp.json();
	const docs = result.docs as UserDocument[];
	if (docs.length === 0) return null;
	const user = docs[0];
	const invite = user.invites.find((i) => i.tokenHash === tokenHash);
	if (!invite || invite.redeemedBy) return null;
	if (new Date(invite.expiresAt).getTime() <= Date.now()) return null;
	return { user, invite };
}

export async function redeemInvite(
	token: string,
	redeemerEmail: string,
): Promise<string> {
	const found = await findInvite(token);
	if (!found) throw new Error("invite_not_found");
	const { user, invite } = found;
	invite.redeemedBy = redeemerEmail;
	try {
		await updateUser(user);
	} catch (err) {
		if ((err as Error).message === "conflict") {
			throw new Error("invite_already_redeemed");
		}
		throw err;
	}
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
	return createUser(email, database, credential);
}

export const usersInternals = {
	sha384,
	sha256,
	userDocId,
	updateUser,
	pruneInvites,
};
