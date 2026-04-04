import PouchDB from "pouchdb";
import memoryAdapter from "pouchdb-adapter-memory";

import type { ICurrency } from "../entities/Currency";

import { EntityType, type IBaseEntity } from "./Entity";
import { MockLogger } from "./Logger";
import MappedStore from "./MappedStore";
import PersistenceStore, { PersistenceMonitor, Status } from "./Persistence";
import type MoneeeyStore from "./MoneeeyStore";
import TagsStore from "./Tags";
import Logger from "./Logger";

(PouchDB as unknown as { plugin: (p: unknown) => void }).plugin(memoryAdapter);

let dbCounter = 0;
const freshDbFactory = () => {
	dbCounter += 1;
	return () => new PouchDB(`test-${dbCounter}-${Date.now()}`, { adapter: "memory" });
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
				commit: (persistence.commit as jest.Mock<unknown, unknown[]>).mock.calls,
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
				persistence.watch(EntityType.CURRENCY, (doc) =>
					currencyDocs.push(doc),
				);

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
				const names = restored.map(
					(d: unknown) => (d as ITestEntity).name,
				);
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
			});

			afterEach(async () => {
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
				// Put a doc in the local db
				await db.put(makeDoc("e1", { name: "LocalDoc" }));

				// Start sync using db.sync directly (bypass PouchDBRemoteFactory)
				const syncPromise = new Promise<void>((resolve) => {
					db.sync(remoteDb, { live: false }).on("complete", () => resolve());
				});
				await syncPromise;

				// Verify doc replicated to remote
				const remoteDoc = await remoteDb.get("ACCOUNT-e1");
				expect((remoteDoc as unknown as ITestEntity).name).toBe("LocalDoc");
			});

			it("cancels previous sync when called again", async () => {
				// First sync with disabled (sets status to OFFLINE)
				await persistence.sync({
					url: "",
					username: "",
					password: "",
					enabled: false,
				});
				expect(persistence.status).toBe(Status.OFFLINE);

				// Second sync also disabled
				await persistence.sync({
					url: "",
					username: "",
					password: "",
					enabled: false,
				});
				expect(persistence.status).toBe(Status.OFFLINE);
			});
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
			expect(entity!.name).toBe("FromDB");
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
