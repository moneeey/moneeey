import "fake-indexeddb/auto";

import { LocalStore } from "../storage/LocalStore";
import {
	type EncryptedRecord,
	type MetaStore,
	type PlainEntity,
	changePassphrase,
	decryptEntity,
	encryptEntity,
	hasEncryptionMeta,
	readMetaDoc,
	setupNewEncryption,
	unlockExistingEncryption,
	verifyPassphrase,
} from "./codec";

let dbCounter = 0;
const freshLocalStore = async () => {
	dbCounter += 1;
	const s = new LocalStore(`codec-test-${dbCounter}-${Date.now()}`);
	await s.open();
	return s;
};

class MemoryMetaStore implements MetaStore {
	private meta: Parameters<MetaStore["setEncryptionMeta"]>[0] | null = null;
	async getEncryptionMeta() {
		return this.meta;
	}
	async setEncryptionMeta(meta: Parameters<MetaStore["setEncryptionMeta"]>[0]) {
		this.meta = meta;
	}
}

describe("codec - meta", () => {
	it("setupNewEncryption writes a meta and returns a usable key", async () => {
		const store = new MemoryMetaStore();
		expect(await hasEncryptionMeta(store)).toBe(false);
		const dataKey = await setupNewEncryption(store, "correct-horse-battery");
		expect(dataKey).toBeDefined();
		expect(await hasEncryptionMeta(store)).toBe(true);
		const meta = await readMetaDoc(store);
		expect(meta?.kdf).toBe("PBKDF2");
		expect(typeof meta?.salt).toBe("string");
		expect(typeof meta?.wrapped_key).toBe("string");
	});

	it("setupNewEncryption refuses to overwrite existing meta", async () => {
		const store = new MemoryMetaStore();
		await setupNewEncryption(store, "p1");
		await expect(setupNewEncryption(store, "p2")).rejects.toThrow();
	});

	it("unlockExistingEncryption returns the same data key", async () => {
		const store = new MemoryMetaStore();
		const original = await setupNewEncryption(store, "passphrase-1");
		const unlocked = await unlockExistingEncryption(store, "passphrase-1");
		const sample = await encryptEntity(
			{ id: "x", updated_at: "u", name: "alice" } as PlainEntity,
			original,
		);
		const round = await decryptEntity(sample, unlocked);
		expect(round.name).toBe("alice");
	});

	it("verifyPassphrase rejects wrong passphrase", async () => {
		const store = new MemoryMetaStore();
		await setupNewEncryption(store, "right");
		await expect(verifyPassphrase(store, "wrong")).rejects.toThrow(
			"wrong_passphrase",
		);
	});

	it("changePassphrase keeps the same data key", async () => {
		const store = new MemoryMetaStore();
		const dataKey = await setupNewEncryption(store, "old");
		const encrypted = await encryptEntity(
			{ id: "x", updated_at: "u", val: 7 } as PlainEntity,
			dataKey,
		);
		await changePassphrase(store, dataKey, "new");
		const reUnlocked = await unlockExistingEncryption(store, "new");
		const decrypted = await decryptEntity(encrypted, reUnlocked);
		expect(decrypted.val).toBe(7);
		await expect(unlockExistingEncryption(store, "old")).rejects.toThrow(
			"wrong_passphrase",
		);
	});

	it("readMetaDoc rejects unsupported future schema", async () => {
		const store = new MemoryMetaStore();
		await store.setEncryptionMeta({
			schema_version: 99 as unknown as number,
			kdf: "PBKDF2",
			iterations: 1,
			hash: "SHA-256",
			salt: "x",
			wrapped_key: "y",
		});
		await expect(readMetaDoc(store)).rejects.toThrow(
			"unsupported_schema_version",
		);
	});
});

describe("codec - entity round trips", () => {
	it("encrypt then decrypt restores body fields", async () => {
		const store = new MemoryMetaStore();
		const dataKey = await setupNewEncryption(store, "p");
		const entity = {
			id: "ACCOUNT-1",
			updated_at: "2026-01-01T00:00:00Z",
			entity_type: "ACCOUNT",
			name: "Checking",
			tags: ["personal"],
		} as PlainEntity;
		const enc = await encryptEntity(entity, dataKey);
		expect(enc.id).toBe("ACCOUNT-1");
		expect(enc.updated_at).toBe("2026-01-01T00:00:00Z");
		expect(enc.deleted_at).toBeNull();
		expect(typeof enc.data).toBe("string");
		expect(enc.data).not.toContain("Checking");

		const decoded = await decryptEntity<PlainEntity>(enc, dataKey);
		expect(decoded.name).toBe("Checking");
		expect(decoded.entity_type).toBe("ACCOUNT");
		expect(decoded.deleted_at).toBeNull();
	});

	it("tombstones round-trip with deleted_at set", async () => {
		const store = new MemoryMetaStore();
		const dataKey = await setupNewEncryption(store, "p");
		const entity = {
			id: "X",
			updated_at: "2026-02-01T00:00:00Z",
			deleted_at: "2026-02-01T00:00:00Z",
			entity_type: "ACCOUNT",
		} as PlainEntity;
		const enc = await encryptEntity(entity, dataKey);
		expect(enc.deleted_at).toBe("2026-02-01T00:00:00Z");
		const decoded = await decryptEntity<PlainEntity>(enc, dataKey);
		expect(decoded.deleted_at).toBe("2026-02-01T00:00:00Z");
	});

	it("data is not decryptable with a different key", async () => {
		const storeA = new MemoryMetaStore();
		const storeB = new MemoryMetaStore();
		const keyA = await setupNewEncryption(storeA, "pA");
		const keyB = await setupNewEncryption(storeB, "pB");
		const enc = await encryptEntity(
			{ id: "X", updated_at: "u", name: "secret" } as PlainEntity,
			keyA,
		);
		await expect(decryptEntity(enc as EncryptedRecord, keyB)).rejects.toThrow();
	});
});

describe("LocalStore satisfies MetaStore", () => {
	it("setup -> verify round trip via real LocalStore", async () => {
		const store = await freshLocalStore();
		try {
			const dataKey = await setupNewEncryption(store, "passphrase-xyz");
			const verified = await verifyPassphrase(store, "passphrase-xyz");
			const entity = {
				id: "T-1",
				updated_at: "u",
				entity_type: "TRANSACTION",
				value: 42,
			} as PlainEntity;
			const enc = await encryptEntity(entity, dataKey);
			const decoded = await decryptEntity<PlainEntity>(enc, verified);
			expect(decoded.value).toBe(42);
		} finally {
			await store.destroy();
		}
	});
});
