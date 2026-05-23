import { EntityType, type IBaseEntity } from "./Entity";
import Logger from "./Logger";
import MappedStore from "./MappedStore";
import type MoneeeyStore from "./MoneeeyStore";
import TagsStore from "./Tags";

interface ITestEntity extends IBaseEntity {
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
		factory: (id?: string) => ({
			id: id || `test-${Math.random()}`,
			entity_type: EntityType.ACCOUNT,
			name: "",
			tags: [],
			updated_at: "",
		}),
	});
	return { store, moneeeyStore };
};

const mergeEntity = (
	store: MappedStore<ITestEntity>,
	overrides: Partial<ITestEntity> = {},
): ITestEntity => {
	const base = store.factory();
	const entity = { ...base, ...overrides } as ITestEntity;
	store.merge(entity, { setUpdated: false });
	// biome-ignore lint/style/noNonNullAssertion: test helper, entity was just merged
	return store.byUuid(entity.id)!;
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
			mergeEntity(store, { id: "e1", name: "First" });
			expect(store.byUuid("e1")?.name).toBe("First");
		});

		it("preserves existing id", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "existing-id" });
			expect(store.byUuid("existing-id")?.id).toBe("existing-id");
		});

		it("sets created if not present", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1" });
			expect(store.byUuid("e1")?.created).toBeTruthy();
		});

		it("preserves existing created", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1", created: "2020-01-01T00:00:00Z" });
			expect(store.byUuid("e1")?.created).toBe("2020-01-01T00:00:00Z");
		});

		it("sets updated_at to current datetime when setUpdated is true", () => {
			const { store } = createStore();
			const base = store.factory();
			store.merge(
				{ ...base, id: "e1", updated_at: "2000-01-01T00:00:00Z" },
				{ setUpdated: true },
			);
			const updated_at = store.byUuid("e1")?.updated_at;
			expect(updated_at).toBeTruthy();
			expect(updated_at).not.toBe("2000-01-01T00:00:00Z");
		});

		it("preserves existing updated_at when setUpdated is false", () => {
			const { store } = createStore();
			mergeEntity(store, {
				id: "e1",
				updated_at: "2020-06-15T00:00:00Z",
			});
			expect(store.byUuid("e1")?.updated_at).toBe("2020-06-15T00:00:00Z");
		});

		it("registers tags", () => {
			const { store, moneeeyStore } = createStore();
			mergeEntity(store, { id: "e1", tags: ["food", "groceries"] });
			expect(moneeeyStore.tags.all).toContain("food");
			expect(moneeeyStore.tags.all).toContain("groceries");
		});

		it("overwrites existing entity with same id", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1", name: "First" });
			mergeEntity(store, { id: "e1", name: "Updated" });
			expect(store.byUuid("e1")?.name).toBe("Updated");
			expect(store.all.length).toBe(1);
		});
	});

	describe("readField", () => {
		it("reads a field from an existing entity", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1", name: "Hello" });
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
			mergeEntity(store, { id: "e1", name: "Old" });
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
			const entity = mergeEntity(store, { id: "e1" });
			store.remove(entity);
			expect(store.byUuid("e1")).toBeUndefined();
		});

		it("sets deleted_at on the entity", () => {
			const { store } = createStore();
			const entity = mergeEntity(store, { id: "e1" });
			store.remove(entity);
			expect(entity.deleted_at).toBeTruthy();
		});
	});

	describe("hasKey", () => {
		it("returns true for existing uuid", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1" });
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
			mergeEntity(store, { id: "e1", name: "Found" });
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
			mergeEntity(store, { id: "e1", name: "Alpha" });
			mergeEntity(store, { id: "e2", name: "Beta" });
			mergeEntity(store, { id: "e3", name: "Alpha" });
			const results = store.byPredicate((e) => e.name === "Alpha");
			expect(results.length).toBe(2);
		});
	});

	describe("find", () => {
		it("returns first matching entity", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1", name: "Alpha" });
			mergeEntity(store, { id: "e2", name: "Beta" });
			expect(store.find((e) => e.name === "Beta")?.id).toBe("e2");
		});

		it("returns undefined when nothing matches", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1", name: "Alpha" });
			expect(store.find((e) => e.name === "Gamma")).toBeUndefined();
		});
	});

	describe("all", () => {
		it("returns all entities", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1" });
			mergeEntity(store, { id: "e2" });
			expect(store.all.length).toBe(2);
		});

		it("returns empty array when empty", () => {
			const { store } = createStore();
			expect(store.all).toEqual([]);
		});
	});

	describe("ids", () => {
		it("returns all ids", () => {
			const { store } = createStore();
			mergeEntity(store, { id: "e1" });
			mergeEntity(store, { id: "e2" });
			expect(store.ids).toEqual(["e1", "e2"]);
		});

		it("returns empty array when empty", () => {
			const { store } = createStore();
			expect(store.ids).toEqual([]);
		});
	});
});
