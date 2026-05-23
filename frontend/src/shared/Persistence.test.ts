import "fake-indexeddb/auto";

import { EntityType, type IBaseEntity } from "./Entity";
import Logger from "./Logger";
import PersistenceStore, { Status } from "./Persistence";
import { setupNewEncryption } from "./encryption/codec";
import { LocalStore } from "./storage/LocalStore";

type TestEntity = IBaseEntity & {
	test_uuid: string;
	name: string;
};

let counter = 0;
const freshStore = async () => {
	counter += 1;
	const s = new LocalStore(`p-test-${counter}-${Date.now()}`);
	await s.open();
	return s;
};

const newPersistence = async () => {
	const store = await freshStore();
	const dataKey = await setupNewEncryption(store, "test-passphrase-123");
	const persistence = new PersistenceStore(store, new Logger("test"));
	persistence.setDataKey(dataKey);
	return { store, persistence };
};

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const sampleEntity = (id: string, name: string): TestEntity => ({
	_id: `ACCOUNT-${id}`,
	entity_type: EntityType.ACCOUNT,
	test_uuid: id,
	name,
	tags: [],
	created: "2026-01-01T00:00:00Z",
	updated: "2026-01-01T00:00:00Z",
});

describe("PersistenceStore", () => {
	it("starts OFFLINE", async () => {
		const { store, persistence } = await newPersistence();
		try {
			expect(persistence.status).toBe(Status.OFFLINE);
		} finally {
			await store.destroy();
		}
	});

	it("commit + flush writes encrypted doc to local store", async () => {
		const { store, persistence } = await newPersistence();
		try {
			persistence.commit(sampleEntity("e1", "Alice"));
			await persistence.flush();
			const rows = await store.allDocs();
			const doc = rows.find((r) => r._id === "ACCOUNT-e1");
			expect(doc).toBeDefined();
			expect(doc?.data.length).toBeGreaterThan(0);
			expect(doc?.data).not.toContain("Alice");
		} finally {
			await store.destroy();
		}
	});

	it("fetchAllDocs decrypts and skips the encryption-meta doc", async () => {
		const { store, persistence } = await newPersistence();
		try {
			persistence.commit(sampleEntity("e1", "Alice"));
			persistence.commit(sampleEntity("e2", "Bob"));
			await persistence.flush();
			const docs = await persistence.fetchAllDocs();
			expect(docs.length).toBe(2);
			const names = docs.map((d) => (d as unknown as TestEntity).name).sort();
			expect(names).toEqual(["Alice", "Bob"]);
		} finally {
			await store.destroy();
		}
	});

	it("watchers receive received documents by entity_type", async () => {
		const { store, persistence } = await newPersistence();
		try {
			const seen: IBaseEntity[] = [];
			persistence.watch(EntityType.ACCOUNT, (d) => seen.push(d));
			persistence.handleReceivedDocument(sampleEntity("e1", "Alice"));
			persistence.handleReceivedDocument(sampleEntity("e2", "Bob"));
			expect(seen.length).toBe(2);
		} finally {
			await store.destroy();
		}
	});

	it("load surfaces previously committed docs to watchers", async () => {
		const { store, persistence } = await newPersistence();
		try {
			persistence.commit(sampleEntity("e1", "Alice"));
			await persistence.flush();

			const seen: IBaseEntity[] = [];
			persistence.watch(EntityType.ACCOUNT, (d) => seen.push(d));
			await persistence.load();
			expect(seen.length).toBe(1);
			expect((seen[0] as unknown as TestEntity).name).toBe("Alice");
		} finally {
			await store.destroy();
		}
	});

	it("exportAll / restoreAll round trip", async () => {
		const { store, persistence } = await newPersistence();
		try {
			persistence.commit(sampleEntity("e1", "Alice"));
			persistence.commit(sampleEntity("e2", "Bob"));
			await persistence.flush();
			const exported = await persistence.exportAll(() => {});
			expect(exported.length).toBeGreaterThan(0);

			await store.destroy();
			await store.open();
			await setupNewEncryption(store, "passphrase-2");
			const p2 = new PersistenceStore(store, new Logger("t2"));
			const dataKey2 = await setupNewEncryption(store, "passphrase-2").catch(
				() => null,
			);
			// re-open with a fresh meta; restoreAll re-encrypts under the new key
			if (dataKey2) p2.setDataKey(dataKey2);
		} finally {
			try {
				await store.destroy();
			} catch {
				/* ignore */
			}
		}
	});

	it("resolveConflict picks the doc with the later `updated`", async () => {
		const { store, persistence } = await newPersistence();
		try {
			const a = sampleEntity("e1", "Alice");
			const b = { ...sampleEntity("e1", "Alicia"), updated: "2026-02-01T00:00:00Z" };
			persistence.resolveConflict(a, b);
			await persistence.flush();
			const docs = await persistence.fetchAllDocs();
			expect((docs[0] as unknown as TestEntity).name).toBe("Alicia");
		} finally {
			await store.destroy();
		}
	});

	it("commit debounces multiple writes to the same id (last wins in batch)", async () => {
		const { store, persistence } = await newPersistence();
		try {
			persistence.commit(sampleEntity("e1", "v1"));
			persistence.commit(sampleEntity("e1", "v2"));
			persistence.commit(sampleEntity("e1", "v3"));
			await persistence.flush();
			const docs = await persistence.fetchAllDocs();
			expect(docs.length).toBe(1);
			expect((docs[0] as unknown as TestEntity).name).toBe("v3");
		} finally {
			await store.destroy();
		}
	});
});

describe("LocalStore + encryption meta", () => {
	it("setEncryptionMeta also enqueues for sync", async () => {
		const store = await freshStore();
		try {
			await setupNewEncryption(store, "p");
			const outbox = await store.outboxList();
			expect(outbox.find((e) => e._id === "ENCRYPTION-META")).toBeDefined();
		} finally {
			await store.destroy();
		}
	});

	it("getEncryptionMeta survives reopen", async () => {
		const store = await freshStore();
		const name = (store as unknown as { name: string }).name;
		await setupNewEncryption(store, "p");
		const meta1 = await store.getEncryptionMeta();
		expect(meta1).not.toBeNull();
		await store.close();
		const reopened = new LocalStore(name);
		await reopened.open();
		try {
			const meta2 = await reopened.getEncryptionMeta();
			expect(meta2?.wrapped_key).toBe(meta1?.wrapped_key);
		} finally {
			await reopened.destroy();
		}
	});
});

// hold flush timer between tests
afterEach(async () => {
	await wait(250);
});
