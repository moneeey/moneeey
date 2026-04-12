import { couchdbInternals } from "./couchdb.ts";
import type { AuthenticatorTransportFuture } from "./deps.ts";
import { Logger } from "./logger.ts";

const logger = Logger("users");

const USERS_DB = "moneeey_users";
const INVITE_INDEX_DDOC = "_design/invites_by_owner";
const INVITE_INDEX_NAME = "by_owner";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_QUOTA_PER_USER = 10;

export type StoredCredential = {
	credentialId: string;
	publicKey: string;
	counter: number;
	transports?: AuthenticatorTransportFuture[];
	createdAt: string;
};

export type UserDocument = {
	_id: string;
	_rev?: string;
	type: "user";
	email: string;
	database: string;
	credentials: StoredCredential[];
	createdAt: string;
};

export type InviteDocument = {
	_id: string;
	_rev?: string;
	type: "invite";
	ownerEmail: string;
	database: string;
	createdAt: string;
	expiresAt: string;
	redeemedBy: string | null;
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
	return `user:${await sha384(email)}`;
}

function inviteDocId(tokenHash: string) {
	return `invite:${tokenHash}`;
}

async function ensureInviteIndex() {
	const ddoc = {
		_id: INVITE_INDEX_DDOC,
		language: "query",
		views: {
			[INVITE_INDEX_NAME]: {
				map: {
					fields: { type: "asc", ownerEmail: "asc" },
					partial_filter_selector: {},
				},
				reduce: "_count",
				options: {
					def: { fields: ["type", "ownerEmail"] },
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
	const resp = await couchdbInternals.dbApi("GET", `${USERS_DB}/${docId}`);
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
		type: "user",
		email,
		database,
		credentials: [credential],
		createdAt: new Date().toISOString(),
	};
	const resp = await couchdbInternals.dbApi("PUT", `${USERS_DB}/${docId}`, doc);
	if (!resp || resp.status !== 201) {
		const body = resp ? await resp.text() : "no response";
		throw new Error(`failed to create user: ${body}`);
	}
	const result = await resp.json();
	doc._rev = result.rev;
	return doc;
}

async function updateUser(user: UserDocument): Promise<UserDocument> {
	const resp = await couchdbInternals.dbApi(
		"PUT",
		`${USERS_DB}/${user._id}`,
		user,
	);
	if (resp?.status === 409) throw new Error("conflict");
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

async function countActiveInvitesFor(ownerEmail: string): Promise<number> {
	const nowIso = new Date().toISOString();
	const resp = await couchdbInternals.dbApi("POST", `${USERS_DB}/_find`, {
		selector: {
			type: "invite",
			ownerEmail,
			redeemedBy: null,
			expiresAt: { $gt: nowIso },
		},
		use_index: [
			INVITE_INDEX_DDOC.replace(/^_design\//, ""),
			INVITE_INDEX_NAME,
		],
		fields: ["_id"],
		limit: INVITE_QUOTA_PER_USER + 1,
	});
	if (!resp || resp.status !== 200) return 0;
	const result = await resp.json();
	return (result.docs as unknown[]).length;
}

export async function createInvite(email: string): Promise<string> {
	const user = await getUserByEmail(email);
	if (!user) throw new Error("user not found");
	const active = await countActiveInvitesFor(email);
	if (active >= INVITE_QUOTA_PER_USER) {
		throw new Error("invite_quota_exceeded");
	}
	const tokenBytes = new Uint8Array(32);
	crypto.getRandomValues(tokenBytes);
	const token = Array.from(tokenBytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const tokenHash = await sha256(token);
	const now = Date.now();
	const doc: InviteDocument = {
		_id: inviteDocId(tokenHash),
		type: "invite",
		ownerEmail: email,
		database: user.database,
		createdAt: new Date(now).toISOString(),
		expiresAt: new Date(now + INVITE_TTL_MS).toISOString(),
		redeemedBy: null,
	};
	const resp = await couchdbInternals.dbApi(
		"PUT",
		`${USERS_DB}/${doc._id}`,
		doc,
	);
	if (!resp || resp.status !== 201) {
		const body = resp ? await resp.text() : "no response";
		throw new Error(`failed to create invite: ${body}`);
	}
	return token;
}

async function getInviteByHash(tokenHash: string): Promise<InviteDocument | null> {
	const resp = await couchdbInternals.dbApi(
		"GET",
		`${USERS_DB}/${inviteDocId(tokenHash)}`,
	);
	if (!resp || resp.status !== 200) return null;
	return (await resp.json()) as InviteDocument;
}

export async function findInvite(
	token: string,
): Promise<{ invite: InviteDocument } | null> {
	const tokenHash = await sha256(token);
	const invite = await getInviteByHash(tokenHash);
	if (!invite) return null;
	if (invite.redeemedBy) return null;
	if (new Date(invite.expiresAt).getTime() <= Date.now()) return null;
	return { invite };
}

export async function redeemInvite(
	token: string,
	redeemerEmail: string,
): Promise<string> {
	const found = await findInvite(token);
	if (!found) throw new Error("invite_not_found");
	const { invite } = found;
	invite.redeemedBy = redeemerEmail;
	const resp = await couchdbInternals.dbApi(
		"PUT",
		`${USERS_DB}/${invite._id}`,
		invite,
	);
	if (resp?.status === 409) throw new Error("invite_already_redeemed");
	if (!resp || resp.status !== 201) {
		const body = resp ? await resp.text() : "no response";
		throw new Error(`failed to redeem invite: ${body}`);
	}
	await couchdbInternals.dbSecurityAddMember(invite.database, redeemerEmail);
	return invite.database;
}

export async function generateDatabaseName(email: string): Promise<string> {
	return `pk${await sha384(`passkey:${email}`)}`;
}

export async function createUserWithDatabase(
	email: string,
	credential: StoredCredential,
): Promise<UserDocument> {
	const database = await generateDatabaseName(email);
	await couchdbInternals.prepareUserDatabase(database, email);
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
	countActiveInvitesFor,
	getInviteByHash,
};
