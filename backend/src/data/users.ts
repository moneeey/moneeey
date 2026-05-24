import type { Storage } from "../db/storage.ts";
import { passkeyUserId } from "./ids.ts";
import type { StoredCredential, UserRecord } from "./types.ts";

type UserRow = {
	id: string;
	email: string;
	credentials: string;
	created_at: string;
};

const toUser = (row: UserRow): UserRecord => ({
	id: row.id,
	email: row.email,
	credentials: JSON.parse(row.credentials) as StoredCredential[],
	createdAt: row.created_at,
});

export async function getUserByEmail(
	storage: Storage,
	email: string,
): Promise<UserRecord | null> {
	return await storage.withMeta((db) => {
		const row = db
			.prepare(
				"SELECT id, email, credentials, created_at FROM users WHERE email = ?",
			)
			.get<UserRow>(email);
		return row ? toUser(row) : null;
	});
}

export async function getUserById(
	storage: Storage,
	userId: string,
): Promise<UserRecord | null> {
	return await storage.withMeta((db) => {
		const row = db
			.prepare(
				"SELECT id, email, credentials, created_at FROM users WHERE id = ?",
			)
			.get<UserRow>(userId);
		return row ? toUser(row) : null;
	});
}

export async function createUser(
	storage: Storage,
	email: string,
	credential: StoredCredential,
): Promise<UserRecord> {
	const id = await passkeyUserId(email);
	const createdAt = new Date().toISOString();
	const credentials = JSON.stringify([credential]);
	await storage.withMeta((db) => {
		db.prepare(
			"INSERT INTO users (id, email, credentials, created_at) VALUES (?, ?, ?, ?)",
		).run(id, email, credentials, createdAt);
	});
	return { id, email, credentials: [credential], createdAt };
}

export async function replaceCredentials(
	storage: Storage,
	email: string,
	credential: StoredCredential,
): Promise<UserRecord> {
	const user = await getUserByEmail(storage, email);
	if (!user) throw new Error("user not found");
	const next = [credential];
	await storage.withMeta((db) => {
		db.prepare("UPDATE users SET credentials = ? WHERE id = ?").run(
			JSON.stringify(next),
			user.id,
		);
	});
	return { ...user, credentials: next };
}

export async function addCredential(
	storage: Storage,
	email: string,
	credential: StoredCredential,
): Promise<UserRecord> {
	const user = await getUserByEmail(storage, email);
	if (!user) throw new Error("user not found");
	const next = [...user.credentials, credential];
	await storage.withMeta((db) => {
		db.prepare("UPDATE users SET credentials = ? WHERE id = ?").run(
			JSON.stringify(next),
			user.id,
		);
	});
	return { ...user, credentials: next };
}

export async function updateCredentialCounter(
	storage: Storage,
	email: string,
	credentialId: string,
	newCounter: number,
): Promise<void> {
	const user = await getUserByEmail(storage, email);
	if (!user) throw new Error("user not found");
	const cred = user.credentials.find((c) => c.credentialId === credentialId);
	if (!cred) throw new Error("credential not found");
	cred.counter = newCounter;
	await storage.withMeta((db) => {
		db.prepare("UPDATE users SET credentials = ? WHERE id = ?").run(
			JSON.stringify(user.credentials),
			user.id,
		);
	});
}
