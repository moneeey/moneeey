import { EntityType, type IBaseEntity } from "./Entity";
import MappedStore from "./MappedStore";
import Logger from "./Logger";
import TagsStore from "./Tags";
import type MoneeeyStore from "./MoneeeyStore";

interface ITestEntity extends IBaseEntity {
	test_uuid: string;
	name: string;
}

const mockMoneeeyStore = () => {
	const logger = new Logger("test");
	const tags = new TagsStore(logger);
	return { logger, tags } as unknown as MoneeeyStore;
};

const createStore = () => {
	const moneeeyStore = mockMoneeeyStore();
	const store = new MappedStore<ITestEntity>(moneeeyStore, {
		getUuid: (item) => item.test_uuid,
		factory: (id?: string) => ({
			entity_type: EntityType.ACCOUNT,
			test_uuid: id || `test-${Math.random()}`,
			name: "",
			tags: [],
		}),
	});
	return { store, moneeeyStore };
};

const mergeEntity = (
	store: MappedStore<ITestEntity>,
	overrides: Partial<ITestEntity> = {},
): ITestEntity => {
	const base = store.factory();
	const entity = { ...base, ...overrides };
	store.merge(entity, { setUpdated: false });
	return store.byUuid(store.getUuid(entity))!;
};

describe("MappedStore", () => {
	describe("entityType", () => {
		it("returns the entity type from the factory", () => {
			const { store } = createStore();
			expect(store.entityType()).toBe(EntityType.ACCOUNT);
		});
	});

	describe("merge", () => {
		it("adds an entity to the store", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "First" });
			expect(store.byUuid("e1")?.name).toBe("First");
		});

		it("sets _id from entity_type and uuid", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1" });
			expect(store.byUuid("e1")?._id).toBe("ACCOUNT-e1");
		});

		it("sets created if not present", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1" });
			expect(store.byUuid("e1")?.created).toBeTruthy();
		});

		it("preserves existing created", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", created: "2020-01-01T00:00:00Z" });
			expect(store.byUuid("e1")?.created).toBe("2020-01-01T00:00:00Z");
		});

		it("sets updated to current datetime when setUpdated is true", () => {
			const { store } = createStore();
			const base = store.factory();
			store.merge(
				{ ...base, test_uuid: "e1", updated: "2000-01-01T00:00:00Z" },
				{ setUpdated: true },
			);
			const updated = store.byUuid("e1")?.updated;
			expect(updated).toBeTruthy();
			// Should be overwritten to current time, not the old value
			expect(updated).not.toBe("2000-01-01T00:00:00Z");
		});

		it("preserves existing updated when setUpdated is false", () => {
			const { store } = createStore();
			mergeEntity(store, {
				test_uuid: "e1",
				updated: "2020-06-15T00:00:00Z",
			});
			expect(store.byUuid("e1")?.updated).toBe("2020-06-15T00:00:00Z");
		});

		it("registers tags", () => {
			const { store, moneeeyStore } = createStore();
			mergeEntity(store, { test_uuid: "e1", tags: ["food", "groceries"] });
			expect(moneeeyStore.tags.all).toContain("food");
			expect(moneeeyStore.tags.all).toContain("groceries");
		});

		it("overwrites existing entity with same uuid", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "First" });
			mergeEntity(store, { test_uuid: "e1", name: "Updated" });
			expect(store.byUuid("e1")?.name).toBe("Updated");
			expect(store.all.length).toBe(1);
		});
	});

	describe("readField", () => {
		it("reads a field from an existing entity", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "Hello" });
			expect(store.readField("e1", "name")).toBe("Hello");
		});

		it("returns factory default for unknown entity", () => {
			const { store } = createStore();
			expect(store.readField("unknown", "name")).toBe("");
		});
	});

	describe("update", () => {
		it("updates fields on an existing entity", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "Old" });
			store.update("e1", { name: "New" });
			expect(store.byUuid("e1")?.name).toBe("New");
		});

		it("creates entity from factory if not found", () => {
			const { store } = createStore();
			store.update("new-id", { name: "Created" });
			expect(store.byUuid("new-id")?.name).toBe("Created");
		});
	});

	describe("remove", () => {
		it("removes entity from the store", () => {
			const { store } = createStore();
			const entity = mergeEntity(store, { test_uuid: "e1" });
			store.remove(entity);
			expect(store.byUuid("e1")).toBeUndefined();
		});

		it("sets _deleted on the entity", () => {
			const { store } = createStore();
			const entity = mergeEntity(store, { test_uuid: "e1" });
			store.remove(entity);
			expect(entity._deleted).toBe(true);
		});
	});

	describe("hasKey", () => {
		it("returns true for existing uuid", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1" });
			expect(store.hasKey("e1")).toBe(true);
		});

		it("returns false for unknown uuid", () => {
			const { store } = createStore();
			expect(store.hasKey("nonexistent")).toBe(false);
		});

		it("returns false for undefined", () => {
			const { store } = createStore();
			expect(store.hasKey(undefined)).toBe(false);
		});

		it("returns false for empty string", () => {
			const { store } = createStore();
			expect(store.hasKey("")).toBe(false);
		});
	});

	describe("byUuid", () => {
		it("returns entity for existing uuid", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "Found" });
			expect(store.byUuid("e1")?.name).toBe("Found");
		});

		it("returns undefined for unknown uuid", () => {
			const { store } = createStore();
			expect(store.byUuid("nonexistent")).toBeUndefined();
		});

		it("returns undefined for empty string", () => {
			const { store } = createStore();
			expect(store.byUuid("")).toBeUndefined();
		});

		it("returns undefined for undefined", () => {
			const { store } = createStore();
			expect(store.byUuid(undefined)).toBeUndefined();
		});
	});

	describe("byPredicate", () => {
		it("filters entities by predicate", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "Alpha" });
			mergeEntity(store, { test_uuid: "e2", name: "Beta" });
			mergeEntity(store, { test_uuid: "e3", name: "Alpha" });
			const results = store.byPredicate((e) => e.name === "Alpha");
			expect(results.length).toBe(2);
		});
	});

	describe("find", () => {
		it("returns first matching entity", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "Alpha" });
			mergeEntity(store, { test_uuid: "e2", name: "Beta" });
			expect(store.find((e) => e.name === "Beta")?.test_uuid).toBe("e2");
		});

		it("returns undefined when nothing matches", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1", name: "Alpha" });
			expect(store.find((e) => e.name === "Gamma")).toBeUndefined();
		});
	});

	describe("all", () => {
		it("returns all entities", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1" });
			mergeEntity(store, { test_uuid: "e2" });
			expect(store.all.length).toBe(2);
		});

		it("returns empty array when empty", () => {
			const { store } = createStore();
			expect(store.all).toEqual([]);
		});
	});

	describe("ids", () => {
		it("returns all uuids", () => {
			const { store } = createStore();
			mergeEntity(store, { test_uuid: "e1" });
			mergeEntity(store, { test_uuid: "e2" });
			expect(store.ids).toEqual(["e1", "e2"]);
		});

		it("returns empty array when empty", () => {
			const { store } = createStore();
			expect(store.ids).toEqual([]);
		});
	});
});
