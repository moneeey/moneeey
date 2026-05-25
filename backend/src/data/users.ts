import type { Storage } from "../db/storage.ts";
import { generateUserId } from "./ids.ts";
import type { StoredPasskey, UserRecord } from "./types.ts";

type UserRow = {
	id: string;
	display_name: string;
	created_at: string;
};

type PasskeyRow = {
	credential_id: string;
	user_id: string;
	public_key: string;
	counter: number;
	transports_json: string | null;
	created_at: string;
};

const toUser = (row: UserRow): UserRecord => ({
	id: row.id,
	displayName: row.display_name,
	createdAt: row.created_at,
});

const toPasskey = (row: PasskeyRow): StoredPasskey => ({
	credentialId: row.credential_id,
	userId: row.user_id,
	publicKey: row.public_key,
	counter: row.counter,
	transports: row.transports_json
		? (JSON.parse(row.transports_json) as StoredPasskey["transports"])
		: undefined,
	createdAt: row.created_at,
});

export async function getUserById(
	storage: Storage,
	userId: string,
): Promise<UserRecord | null> {
	return await storage.withMeta((db) => {
		const row = db
			.prepare("SELECT id, display_name, created_at FROM users WHERE id = ?")
			.get<UserRow>(userId);
		return row ? toUser(row) : null;
	});
}

export async function getUserByCredentialId(
	storage: Storage,
	credentialId: string,
): Promise<{ user: UserRecord; passkey: StoredPasskey } | null> {
	return await storage.withMeta((db) => {
		const passkeyRow = db
			.prepare(
				`SELECT credential_id, user_id, public_key, counter, transports_json, created_at
				 FROM passkeys WHERE credential_id = ?`,
			)
			.get<PasskeyRow>(credentialId);
		if (!passkeyRow) return null;
		const userRow = db
			.prepare("SELECT id, display_name, created_at FROM users WHERE id = ?")
			.get<UserRow>(passkeyRow.user_id);
		if (!userRow) return null;
		return { user: toUser(userRow), passkey: toPasskey(passkeyRow) };
	});
}

export async function createUser(
	storage: Storage,
	displayName: string,
): Promise<UserRecord> {
	const id = generateUserId();
	const createdAt = new Date().toISOString();
	await storage.withMeta((db) => {
		db.prepare(
			"INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)",
		).run(id, displayName, createdAt);
	});
	return { id, displayName, createdAt };
}

export async function addPasskey(
	storage: Storage,
	userId: string,
	passkey: Omit<StoredPasskey, "userId">,
): Promise<StoredPasskey> {
	await storage.withMeta((db) => {
		db.prepare(
			`INSERT INTO passkeys (credential_id, user_id, public_key, counter, transports_json, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		).run(
			passkey.credentialId,
			userId,
			passkey.publicKey,
			passkey.counter,
			passkey.transports ? JSON.stringify(passkey.transports) : null,
			passkey.createdAt,
		);
	});
	return { ...passkey, userId };
}

export async function updatePasskeyCounter(
	storage: Storage,
	credentialId: string,
	newCounter: number,
): Promise<void> {
	await storage.withMeta((db) => {
		const changes = db
			.prepare("UPDATE passkeys SET counter = ? WHERE credential_id = ?")
			.run(newCounter, credentialId);
		if (changes === 0) throw new Error("passkey not found");
	});
}
