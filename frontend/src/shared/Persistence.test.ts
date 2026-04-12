import PouchDB from "pouchdb";
import memoryAdapter from "pouchdb-adapter-memory";

import type { ICurrency } from "../entities/Currency";

import { EntityType, type IBaseEntity } from "./Entity";
import { MockLogger } from "./Logger";
import Logger from "./Logger";
import MappedStore from "./MappedStore";
import type MoneeeyStore from "./MoneeeyStore";
import PersistenceStore, {
	CONFIG_DOC_ID,
	PersistenceMonitor,
	Status,
} from "./Persistence";
import TagsStore from "./Tags";
import {
	ENCRYPTION_META_ID,
	changePassphrase as changePassphraseInMeta,
	decryptDoc,
	hasEncryptionMeta,
	installEncryptionTransform,
	openRawDatabase,
	readMetaDoc,
	setupNewEncryption,
	unlockExistingEncryption,
} from "./encryption/encryptedPouch";

(PouchDB as unknown as { plugin: (p: unknown) => void }).plugin(memoryAdapter);

let dbCounter = 0;
const freshDbFactory = () => {
	dbCounter += 1;
	return () =>
		new PouchDB(`test-${dbCounter}-${Date.now()}`, { adapter: "memory" });
};

interface ITestEntity extends IBaseEntity {
	test_uuid: string;
	name: string;
}

const mockMoneeeyStore = () => {
	const logger = new Logger("test");
	const tags = new TagsStore(logger);
	return { logger, tags } as unknown as MoneeeyStore;
};

const createTestStore = (moneeeyStore: MoneeeyStore) =>
	new MappedStore<ITestEntity>(moneeeyStore, {
		getUuid: (item) => item.test_uuid,
		factory: (id?: string) => ({
			entity_type: EntityType.ACCOUNT,
			test_uuid: id || `t-${Date.now()}`,
			name: "",
			tags: [],
		}),
	});

const makeDoc = (id: string, overrides: Partial<ITestEntity> = {}) => ({
	_id: `ACCOUNT-${id}`,
	entity_type: EntityType.ACCOUNT,
	test_uuid: id,
	name: "",
	tags: [],
	created: "2024-01-01T00:00:00Z",
	updated: "2024-01-01T00:00:00Z",
	...overrides,
});

describe("Persistence", () => {
	describe("resolveConflict", () => {
		let persistence: PersistenceStore;
		let mockLogger: MockLogger;

		const yesterday = {
			updated: "2022-10-13T22:00:26-03:00",
			created: "2022-10-13T22:00:26-03:00",
		};

		const today = {
			updated: "2022-10-14T23:00:26-03:00",
			created: "2022-10-14T23:00:26-03:00",
		};

		const rev1 = { _rev: "1-13cc7a98be34fcf6a409b9808b592025" };
		const rev2 = { _rev: "2-13cc7a98be34fcf6a409b9808b592030" };

		const sampleCurrency = (obj: object): ICurrency => ({
			entity_type: EntityType.CURRENCY,
			currency_uuid: "Bitcoin_BTC",
			name: "Bitcoin",
			short: "BTC",
			prefix: "₿",
			suffix: "",
			decimals: 8,
			tags: [],
			_id: "CURRENCY-Bitcoin_BTC",
			...obj,
		});

		beforeEach(() => {
			mockLogger = new MockLogger("tests");
			persistence = new PersistenceStore(
				() => ({}) as PouchDB.Database,
				mockLogger,
			);
			jest.spyOn(persistence, "commit").mockReturnValue();
		});

		const thenExpect = ({
			updated,
			outdated,
			resolved,
		}: { updated: object; outdated: object; resolved: object }) => {
			const state = {
				log: mockLogger.calls,
				commit: (persistence.commit as jest.Mock<unknown, unknown[]>).mock
					.calls,
			};
			expect(state).toEqual({
				log: [
					{
						level: "info",
						text: "tests:persistence:resolve conflict",
						args: [
							{
								updated,
								outdated,
								resolved,
							},
						],
					},
				],
				commit: [[resolved]],
			});
		};

		it("take document with _rev over documents without _rev", () => {
			const a = sampleCurrency({ ...today, ...rev1 });
			const b = sampleCurrency({ ...yesterday });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: a,
			});
		});

		it("take document with _rev over documents without _rev reversed", () => {
			const a = sampleCurrency({ ...today });
			const b = sampleCurrency({ ...yesterday, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: b,
			});
		});

		it("take document latest and copy newer _rev", () => {
			const a = sampleCurrency({ ...today, ...rev1 });
			const b = sampleCurrency({ ...yesterday, ...rev2 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: { ...a, ...rev2 },
			});
		});

		it("take document with newer _rev a b reversed", () => {
			const a = sampleCurrency({ ...today, ...rev2 });
			const b = sampleCurrency({ ...yesterday, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: a,
			});
		});

		it("take document with _rev over documents without _rev with older date", () => {
			const a = sampleCurrency({ ...today });
			const b = sampleCurrency({ ...yesterday, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: b,
			});
		});

		it("chooses latest document between two with same _rev", () => {
			const a = sampleCurrency({ ...yesterday, ...rev1 });
			const b = sampleCurrency({ ...today, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: { ...a, ...b },
			});
		});

		it("prefers higher rev level when same updated timestamp", () => {
			const sameTime = {
				updated: "2022-10-14T23:00:26-03:00",
				created: "2022-10-14T23:00:26-03:00",
			};
			const a = sampleCurrency({ ...sameTime, ...rev2 });
			const b = sampleCurrency({ ...sameTime, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: a,
			});
		});

		it("prefers higher rev level when same updated timestamp reversed", () => {
			const sameTime = {
				updated: "2022-10-14T23:00:26-03:00",
				created: "2022-10-14T23:00:26-03:00",
			};
			const a = sampleCurrency({ ...sameTime, ...rev1 });
			const b = sampleCurrency({ ...sameTime, ...rev2 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: b,
			});
		});

		it("falls back to b when both equal", () => {
			const sameTime = {
				updated: "2022-10-14T23:00:26-03:00",
				created: "2022-10-14T23:00:26-03:00",
			};
			const a = sampleCurrency({ ...sameTime, ...rev1 });
			const b = sampleCurrency({ ...sameTime, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: { ...a, ...b },
			});
		});
	});

	describe("PouchDBRemoteFactory", () => {
		it("creates PouchDB with basic auth for non-JWT", () => {
			const { PouchDBRemoteFactory } = jest.requireActual(
				"./Persistence",
			) as typeof import("./Persistence");
			// Just verify it doesn't throw — actual connection not needed
			expect(() =>
				PouchDBRemoteFactory({
					url: "http://localhost:5984/testdb",
					username: "user",
					password: "pass",
					enabled: true,
				}),
			).not.toThrow();
		});
	});

	describe("PersistenceStore with real PouchDB", () => {
		let persistence: PersistenceStore;
		let mockLogger: MockLogger;
		let db: PouchDB.Database;

		beforeEach(() => {
			mockLogger = new MockLogger("tests");
			const factory = freshDbFactory();
			db = factory();
			persistence = new PersistenceStore(() => db, mockLogger);
		});

		afterEach(async () => {
			// Wait for any pending debounced operations
			await new Promise((r) => setTimeout(r, 300));
			try {
				await db.destroy();
			} catch {
				// already destroyed
			}
		});

		describe("fetchAllDocs", () => {
			it("returns empty array for empty db", async () => {
				const docs = await persistence.fetchAllDocs();
				expect(docs).toEqual([]);
			});

			it("returns all docs after inserting", async () => {
				await db.bulkDocs([
					makeDoc("e1", { name: "First" }),
					makeDoc("e2", { name: "Second" }),
				]);
				const docs = await persistence.fetchAllDocs();
				expect(docs).toHaveLength(2);
			});
		});

		describe("load", () => {
			it("loads docs and notifies watchers", async () => {
				await db.bulkDocs([makeDoc("e1", { name: "Loaded" })]);
				const received: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => received.push(doc));
				await persistence.load();
				expect(received).toHaveLength(1);
				expect((received[0] as ITestEntity).name).toBe("Loaded");
			});

			it("handles empty database gracefully", async () => {
				await persistence.load();
				// should not throw
			});

			it("handles load errors gracefully", async () => {
				await db.destroy();
				await persistence.load();
				const errorLogs = mockLogger.calls.filter(
					(c) => (c as { level: string }).level === "error",
				);
				expect(errorLogs.length).toBeGreaterThan(0);
			});
		});

		describe("commit + doCommit", () => {
			it("writes document to database via doCommit", async () => {
				const doc = makeDoc("e1", { name: "Committed" });
				persistence.commit(doc as never);
				await persistence.doCommit();

				const result = await db.get("ACCOUNT-e1");
				expect((result as unknown as ITestEntity).name).toBe("Committed");
			});

			it("batches multiple commits", async () => {
				persistence.commit(makeDoc("e1", { name: "A" }) as never);
				persistence.commit(makeDoc("e2", { name: "B" }) as never);
				persistence.commit(makeDoc("e3", { name: "C" }) as never);
				await persistence.doCommit();

				const docs = await persistence.fetchAllDocs();
				expect(docs).toHaveLength(3);
			});

			it("successful commit writes to database", async () => {
				const doc = makeDoc("e1", { name: "First" });
				persistence.commit(doc as never);
				await persistence.doCommit();

				// Verify doc was written to PouchDB
				const result = await db.get("ACCOUNT-e1");
				expect((result as unknown as ITestEntity).name).toBe("First");
			});

			it("logs error when bulkDocs response id does not match", async () => {
				jest
					.spyOn(db, "bulkDocs")
					.mockResolvedValueOnce([
						{ ok: true, id: "NONEXISTENT-id", rev: "1-abc" },
					] as never);

				persistence.commit(makeDoc("e1") as never);
				await persistence.doCommit();

				const errorLogs = mockLogger.calls.filter(
					(c) => (c as { level: string }).level === "error",
				);
				expect(errorLogs.length).toBeGreaterThan(0);
			});

			it("logs error when bulkDocs returns error for a doc", async () => {
				jest
					.spyOn(db, "bulkDocs")
					.mockResolvedValueOnce([
						{ error: true, status: 500, id: "ACCOUNT-e1", message: "fail" },
					] as never);

				persistence.commit(makeDoc("e1") as never);
				await persistence.doCommit();

				const errorLogs = mockLogger.calls.filter(
					(c) => (c as { level: string }).level === "error",
				);
				expect(errorLogs.length).toBeGreaterThan(0);
			});
		});

		describe("refetch", () => {
			it("fetches a doc by id and notifies watchers", async () => {
				await db.put(makeDoc("e1", { name: "Refetched" }));
				const received: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => received.push(doc));

				await persistence.refetch("ACCOUNT-e1");
				expect(received).toHaveLength(1);
				expect((received[0] as ITestEntity).name).toBe("Refetched");
			});
		});

		describe("doRefetch", () => {
			it("refetches docs by id and notifies watchers", async () => {
				// Put docs directly so they exist in DB
				await db.put(makeDoc("e1", { name: "R1" }));
				await db.put(makeDoc("e2", { name: "R2" }));

				const received: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => received.push(doc));

				// Refetch each individually
				await persistence.refetch("ACCOUNT-e1");
				await persistence.refetch("ACCOUNT-e2");
				expect(received).toHaveLength(2);
			});
		});

		describe("watch + notifyDocument", () => {
			it("dispatches to correct entity type watcher", () => {
				const accountDocs: unknown[] = [];
				const currencyDocs: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => accountDocs.push(doc));
				persistence.watch(EntityType.CURRENCY, (doc) => currencyDocs.push(doc));

				persistence.notifyDocument(makeDoc("e1") as never);
				persistence.notifyDocument({
					...makeDoc("c1"),
					entity_type: EntityType.CURRENCY,
				} as never);

				expect(accountDocs).toHaveLength(1);
				expect(currencyDocs).toHaveLength(1);
			});

			it("supports multiple watchers per entity type", () => {
				const a: unknown[] = [];
				const b: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => a.push(doc));
				persistence.watch(EntityType.ACCOUNT, (doc) => b.push(doc));

				persistence.notifyDocument(makeDoc("e1") as never);
				expect(a).toHaveLength(1);
				expect(b).toHaveLength(1);
			});

			it("does nothing for unwatched entity types", () => {
				// Should not throw
				persistence.notifyDocument(makeDoc("e1") as never);
			});
		});

		describe("handleReceivedDocument", () => {
			it("notifies watchers", () => {
				const received: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => received.push(doc));
				persistence.handleReceivedDocument(makeDoc("e1") as never);
				expect(received).toHaveLength(1);
			});

			it("removes conflicts from the document", async () => {
				// Create a doc with a conflict
				const doc = makeDoc("e1", { name: "Original" });
				await db.put(doc);

				// Force a conflicting revision by putting with new_edits: false
				await db.bulkDocs(
					[
						{
							...doc,
							name: "Conflict",
							_rev: "2-conflicting",
						},
					],
					{ new_edits: false },
				);

				// Fetch with conflicts
				const withConflicts = await db.get("ACCOUNT-e1", { conflicts: true });
				expect(withConflicts._conflicts?.length).toBeGreaterThan(0);

				// handleReceivedDocument should remove conflicts
				const removeSpy = jest.spyOn(db, "remove");
				persistence.handleReceivedDocument(withConflicts as never);
				expect(removeSpy).toHaveBeenCalled();
			});
		});

		describe("truncateAll", () => {
			it("destroys the database", async () => {
				await db.put(makeDoc("e1"));
				persistence.truncateAll();
				// After destroy completes, operations should fail
				await new Promise((r) => setTimeout(r, 100));
				await expect(db.info()).rejects.toThrow();
			});
		});

		describe("exportAll / restoreAll", () => {
			it("exports all docs as JSON", async () => {
				await db.bulkDocs([
					makeDoc("e1", { name: "Export1" }),
					makeDoc("e2", { name: "Export2" }),
				]);

				const progress: number[] = [];
				const json = await persistence.exportAll((p) => progress.push(p));
				const parsed = JSON.parse(json);

				expect(parsed).toHaveLength(2);
				expect(progress[progress.length - 1]).toBe(100);
			});

			it("restoreAll strips _rev and commits docs", async () => {
				const docs = [
					{ ...makeDoc("e1", { name: "Restore1" }), _rev: "1-abc" },
					{ ...makeDoc("e2", { name: "Restore2" }), _rev: "2-def" },
				];
				const json = JSON.stringify(docs);

				const progress: number[] = [];
				await persistence.restoreAll(json, (p) => progress.push(p));
				await persistence.doCommit();

				const result = await persistence.fetchAllDocs();
				expect(result).toHaveLength(2);
				expect(progress[progress.length - 1]).toBe(100);
			});

			it("round-trip: export → restore → verify", async () => {
				await db.bulkDocs([
					makeDoc("e1", { name: "RoundTrip1" }),
					makeDoc("e2", { name: "RoundTrip2" }),
				]);

				const json = await persistence.exportAll(() => {});

				// Create fresh persistence with new db
				const factory2 = freshDbFactory();
				const db2 = factory2();
				const persistence2 = new PersistenceStore(
					() => db2,
					new MockLogger("test2"),
				);

				await persistence2.restoreAll(json, () => {});
				await persistence2.doCommit();

				const restored = await persistence2.fetchAllDocs();
				expect(restored).toHaveLength(2);
				const names = restored.map((d: unknown) => (d as ITestEntity).name);
				expect(names.sort()).toEqual(["RoundTrip1", "RoundTrip2"]);

				// Wait for pending debounced refetch before destroying
				await new Promise((r) => setTimeout(r, 300));
				await db2.destroy();
			});
		});

		describe("sync", () => {
			let remoteDb: PouchDB.Database;

			beforeEach(() => {
				const remoteFactory = freshDbFactory();
				remoteDb = remoteFactory();
				// Mock PouchDBRemoteFactory to return our in-memory remote DB
				jest
					.spyOn(
						jest.requireActual(
							"./Persistence",
						) as typeof import("./Persistence"),
						"PouchDBRemoteFactory",
					)
					.mockReturnValue(remoteDb);
			});

			afterEach(async () => {
				jest.restoreAllMocks();
				try {
					await remoteDb.destroy();
				} catch {
					// already destroyed
				}
			});

			it("resolves with OFFLINE when disabled", async () => {
				await persistence.sync({
					url: "",
					username: "",
					password: "",
					enabled: false,
				});
				expect(persistence.status).toBe(Status.OFFLINE);
			});

			it("resolves with OFFLINE when url is empty", async () => {
				await persistence.sync({
					url: "",
					username: "",
					password: "",
					enabled: true,
				});
				expect(persistence.status).toBe(Status.OFFLINE);
			});

			it("syncs data between two databases", async () => {
				await db.put(makeDoc("e1", { name: "LocalDoc" }));

				const syncPromise = new Promise<void>((resolve) => {
					db.sync(remoteDb, { live: false }).on("complete", () => resolve());
				});
				await syncPromise;

				const remoteDoc = await remoteDb.get("ACCOUNT-e1");
				expect((remoteDoc as unknown as ITestEntity).name).toBe("LocalDoc");
			});

			it("cancels previous sync when called again", async () => {
				await persistence.sync({
					url: "",
					username: "",
					password: "",
					enabled: false,
				});
				expect(persistence.status).toBe(Status.OFFLINE);

				await persistence.sync({
					url: "",
					username: "",
					password: "",
					enabled: false,
				});
				expect(persistence.status).toBe(Status.OFFLINE);
			});

			it("live sync sets status to ONLINE and replicates changes", async () => {
				// Put a doc in remote before sync starts
				await remoteDb.put(makeDoc("e1", { name: "RemoteDoc" }));

				const received: unknown[] = [];
				persistence.watch(EntityType.ACCOUNT, (doc) => received.push(doc));

				// Start live sync — will resolve on first active/paused/change event
				const syncPromise = persistence.sync({
					url: "http://fake",
					username: "user",
					password: "pass",
					enabled: true,
				});

				await syncPromise;
				expect(persistence.status).toBe(Status.ONLINE);

				// Wait for refetch debounce to complete
				await new Promise((r) => setTimeout(r, 400));
			});
		});
	});

	describe("encryption/encryptedPouch (custom WebCrypto module)", () => {
		let counter = 0;
		const nextName = () => {
			counter += 1;
			return `enc-test-${counter}-${Date.now()}`;
		};

		const freshDb = (name: string) => new PouchDB(name, { adapter: "memory" });

		const cleanup = async (db: PouchDB.Database) => {
			try {
				await db.destroy();
			} catch {
				// already gone
			}
		};

		const makeConfig = () => ({
			_id: CONFIG_DOC_ID,
			entity_type: EntityType.CONFIG,
			date_format: "yyyy-MM-dd",
			decimal_separator: ",",
			thousand_separator: ".",
			default_currency: "",
			view_archived: false,
			created: "2024-01-01T00:00:00Z",
			updated: "2024-01-01T00:00:00Z",
			tags: [],
		});

		it("setupNewEncryption writes an ENCRYPTION-META doc", async () => {
			const db = freshDb(nextName());
			expect(await hasEncryptionMeta(db)).toBe(false);
			const { dataKey } = await setupNewEncryption(db, "correct-horse-battery");
			expect(dataKey).toBeDefined();
			expect(await hasEncryptionMeta(db)).toBe(true);
			const meta = await readMetaDoc(db);
			expect(meta?.entity_type).toBe("ENCRYPTION_META");
			expect(meta?.kdf).toBe("PBKDF2");
			expect(meta?.iterations).toBeGreaterThanOrEqual(100_000);
			expect(typeof meta?.salt).toBe("string");
			expect(typeof meta?.wrapped_key).toBe("string");
			await cleanup(db);
		});

		it("round-trips a doc across a simulated restart under the same passphrase", async () => {
			const name = nextName();
			const passphrase = "correct-horse-battery";

			// First "session": set up, write a Config, close the in-memory
			// handle (the underlying PouchDB data survives).
			const db1 = freshDb(name);
			const { dataKey: dataKey1 } = await setupNewEncryption(db1, passphrase);
			await db1.put(makeConfig());
			const stored = (await db1.get(CONFIG_DOC_ID)) as Record<string, unknown>;
			// On disk the body is encrypted.
			expect(stored.encrypted_body).toBeDefined();
			expect(stored.default_currency).toBeUndefined();
			// Decrypting with the live data key yields plaintext.
			const decrypted = (await decryptDoc(stored, dataKey1)) as Record<
				string,
				unknown
			>;
			expect(decrypted.entity_type).toBe(EntityType.CONFIG);
			expect(decrypted.date_format).toBe("yyyy-MM-dd");

			// Second "session": reopen the same DB, unlock, decrypt.
			const db2 = freshDb(name);
			expect(await hasEncryptionMeta(db2)).toBe(true);
			const { dataKey: dataKey2 } = await unlockExistingEncryption(
				db2,
				passphrase,
			);
			const reloaded = (await db2.get(CONFIG_DOC_ID)) as Record<
				string,
				unknown
			>;
			const reloadedDecrypted = (await decryptDoc(
				reloaded,
				dataKey2,
			)) as Record<string, unknown>;
			expect(reloadedDecrypted.date_format).toBe("yyyy-MM-dd");

			await cleanup(db2);
		});

		it("unlockExistingEncryption rejects the wrong passphrase", async () => {
			const name = nextName();
			const db1 = freshDb(name);
			await setupNewEncryption(db1, "right-passphrase");

			const db2 = freshDb(name);
			await expect(
				unlockExistingEncryption(db2, "wrong-passphrase"),
			).rejects.toThrow("wrong_passphrase");
			await cleanup(db2);
		});

		it("unlockExistingEncryption rejects a database with no meta doc", async () => {
			const db = freshDb(nextName());
			await expect(
				unlockExistingEncryption(db, "any-passphrase"),
			).rejects.toThrow("no_meta_doc");
			await cleanup(db);
		});

		it("changePassphrase re-wraps the data key without touching other docs (O(1))", async () => {
			const name = nextName();
			const passphraseA = "passphrase-alpha";
			const passphraseB = "passphrase-beta";

			const db1 = freshDb(name);
			const { dataKey } = await setupNewEncryption(db1, passphraseA);
			await db1.put(makeConfig());
			const configRevBefore = (
				(await db1.get(CONFIG_DOC_ID)) as { _rev: string }
			)._rev;
			const metaRevBefore = (await readMetaDoc(db1))?._rev;

			await changePassphraseInMeta(db1, dataKey, passphraseB);

			// Config's _rev is unchanged — we never touched it.
			const configRevAfter = (
				(await db1.get(CONFIG_DOC_ID)) as { _rev: string }
			)._rev;
			expect(configRevAfter).toBe(configRevBefore);
			// Meta's _rev bumped once — single write.
			const metaRevAfter = (await readMetaDoc(db1))?._rev;
			expect(metaRevAfter).not.toBe(metaRevBefore);

			// New passphrase works, old one is rejected.
			const db2 = freshDb(name);
			await expect(unlockExistingEncryption(db2, passphraseA)).rejects.toThrow(
				"wrong_passphrase",
			);
			const db3 = freshDb(name);
			const { dataKey: dataKeyB } = await unlockExistingEncryption(
				db3,
				passphraseB,
			);
			const stored = (await db3.get(CONFIG_DOC_ID)) as Record<string, unknown>;
			const plain = (await decryptDoc(stored, dataKeyB)) as Record<
				string,
				unknown
			>;
			expect(plain.entity_type).toBe(EntityType.CONFIG);

			await cleanup(db3);
		});

		// TODO: add a real cross-device test that spins up a CouchDB
		// container and round-trips through it. For now this simulation
		// uses in-memory replication between two PouchDB instances — same
		// transport semantics, no network.
		it("cross-device: device B pulls encrypted docs + meta via replication and unlocks", async () => {
			const remoteName = nextName();
			const localAName = nextName();
			const localBName = nextName();
			const passphrase = "shared-passphrase-123";

			// Device A: set up, write a Config.
			const deviceA = freshDb(localAName);
			await setupNewEncryption(deviceA, passphrase);
			await deviceA.put(makeConfig());

			// "Remote": an empty DB that will receive A's encrypted envelopes.
			const remote = freshDb(remoteName);
			await new Promise<void>((resolve, reject) => {
				deviceA.replicate
					.to(remote)
					.on("complete", () => resolve())
					.on("error", (err: unknown) => reject(err));
			});

			// Device B: fresh, pulls from remote BEFORE running
			// setupNewEncryption. After the pull completes, the meta doc is
			// present so unlock should work with the same passphrase.
			const deviceB = openRawDatabase(localBName);
			await new Promise<void>((resolve, reject) => {
				deviceB.replicate
					.from(remote)
					.on("complete", () => resolve())
					.on("error", (err: unknown) => reject(err));
			});
			expect(await hasEncryptionMeta(deviceB)).toBe(true);

			const { dataKey } = await unlockExistingEncryption(deviceB, passphrase);
			const stored = (await deviceB.get(CONFIG_DOC_ID)) as Record<
				string,
				unknown
			>;
			const plain = (await decryptDoc(stored, dataKey)) as Record<
				string,
				unknown
			>;
			expect(plain.date_format).toBe("yyyy-MM-dd");

			await cleanup(deviceA);
			await cleanup(remote);
			await cleanup(deviceB);
		});

		it("incoming transform leaves the meta doc readable without a key", async () => {
			// A fresh DB that has only setupNewEncryption run on it: we
			// should still be able to read the meta doc via readMetaDoc
			// (which uses a plain `.get`), even though the transform is
			// active.
			const db = freshDb(nextName());
			await setupNewEncryption(db, "some-passphrase-123");
			const meta = await readMetaDoc(db);
			expect(meta).not.toBeNull();
			expect(meta?._id).toBe(ENCRYPTION_META_ID);
			// Not "encrypted" as a doc — the meta payload is inside
			// wrapped_key, not encrypted_body.
			expect(
				(meta as unknown as Record<string, unknown>).encrypted_body,
			).toBeUndefined();
			await cleanup(db);
		});

		it("installEncryptionTransform encrypts ordinary writes but preserves clear routing fields", async () => {
			const db = freshDb(nextName());
			const { dataKey } = await setupNewEncryption(db, "test-passphrase-99");
			installEncryptionTransform(db, dataKey);
			await db.put({
				_id: "ACCOUNT-probe",
				entity_type: EntityType.ACCOUNT,
				name: "Secret Account",
				secret_number: 42,
				updated: "2024-01-01T00:00:00Z",
				tags: [],
			});
			const stored = (await db.get("ACCOUNT-probe")) as Record<string, unknown>;
			// Clear fields are still present on the stored doc.
			expect(stored.entity_type).toBe(EntityType.ACCOUNT);
			expect(stored._id).toBe("ACCOUNT-probe");
			expect(stored.updated).toBe("2024-01-01T00:00:00Z");
			// Body fields are gone from the clear doc — they live only
			// inside the encrypted blob.
			expect(stored.name).toBeUndefined();
			expect(stored.secret_number).toBeUndefined();
			expect(stored.encrypted_body).toBeDefined();
			// decryptDoc brings everything back.
			const plain = (await decryptDoc(stored, dataKey)) as Record<
				string,
				unknown
			>;
			expect(plain.name).toBe("Secret Account");
			expect(plain.secret_number).toBe(42);
			await cleanup(db);
		});
	});

	describe("PersistenceMonitor", () => {
		let persistence: PersistenceStore;
		let moneeeyStore: MoneeeyStore;
		let store: MappedStore<ITestEntity>;
		let db: PouchDB.Database;

		beforeEach(() => {
			const mockLog = new MockLogger("tests");
			const factory = freshDbFactory();
			db = factory();
			persistence = new PersistenceStore(() => db, mockLog);
			moneeeyStore = mockMoneeeyStore();
			store = createTestStore(moneeeyStore);
		});

		afterEach(async () => {
			// Wait for any pending debounced operations to complete
			await new Promise((r) => setTimeout(r, 300));
			try {
				await db.destroy();
			} catch {
				// already destroyed
			}
		});

		it("local store change triggers commit to PouchDB", async () => {
			persistence.monitor(store);

			// Merge into store — monitor should detect and commit
			const entity = store.factory();
			store.merge(
				{ ...entity, test_uuid: "e1", name: "FromStore" },
				{ setUpdated: false },
			);

			// Flush the commit
			await persistence.doCommit();

			const doc = await db.get("ACCOUNT-e1");
			expect((doc as unknown as ITestEntity).name).toBe("FromStore");
		});

		it("loading from DB populates the store via monitor", async () => {
			persistence.monitor(store);

			// Put doc directly in PouchDB
			await db.put(makeDoc("e1", { name: "FromDB" }));

			// Load triggers handleReceivedDocument → watcher → mergeBypassingMonitor
			await persistence.load();

			const entity = store.byUuid("e1");
			expect(entity).toBeDefined();
			expect(entity?.name).toBe("FromDB");
		});

		it("update to existing entity triggers persist", async () => {
			persistence.monitor(store);

			store.merge(
				{ ...store.factory(), test_uuid: "e1", name: "Original" },
				{ setUpdated: false },
			);
			await persistence.doCommit();

			// Refetch to sync _rev back into the store
			await persistence.refetch("ACCOUNT-e1");

			// Update the entity — monitor detects and queues commit
			store.update("e1", { name: "Updated" } as Partial<ITestEntity>);
			await persistence.doCommit();

			const doc = await db.get("ACCOUNT-e1");
			expect((doc as unknown as ITestEntity).name).toBe("Updated");
		});

		it("mergeBypassingMonitor does not re-trigger persist", async () => {
			// Use a fresh persistence+db to avoid debounce leaks from prior tests
			const freshFactory = freshDbFactory();
			const freshDb = freshFactory();
			const freshPersistence = new PersistenceStore(
				() => freshDb,
				new MockLogger("fresh"),
			);
			const freshStore = createTestStore(moneeeyStore);

			const commitSpy = jest.spyOn(freshPersistence, "commit");
			const monitor = new PersistenceMonitor(
				freshPersistence,
				new Logger("test"),
				freshStore,
			);

			const entity = {
				...freshStore.factory(),
				test_uuid: "e1",
				name: "Bypass",
				_id: "ACCOUNT-e1",
			};
			monitor.mergeBypassingMonitor(entity);

			// commit should not have been called for this merge
			expect(commitSpy).not.toHaveBeenCalled();
			// But entity should be in store
			expect(freshStore.byUuid("e1")?.name).toBe("Bypass");

			await freshDb.destroy();
		});
	});
});
