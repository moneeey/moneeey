import { isEmpty } from "lodash";
import { action, computed, makeObservable, observable } from "mobx";

import { currentDateTime } from "../utils/Date";
import { uuid as generateId } from "../utils/Utils";

import type { IBaseEntity } from "./Entity";
import type MoneeeyStore from "./MoneeeyStore";

export default class MappedStore<T extends IBaseEntity> {
	public readonly itemsByUuid = new Map<string, T>();

	public readonly factory: (id?: string) => T;

	public readonly moneeeyStore: MoneeeyStore;

	constructor(
		moneeeyStore: MoneeeyStore,
		config: {
			factory: (id?: string) => T;
		},
	) {
		this.factory = config.factory;
		this.moneeeyStore = moneeeyStore;
		makeObservable(this, {
			itemsByUuid: observable,
			merge: action,
			remove: action,
			all: computed,
			ids: computed,
		});
	}

	entityType() {
		return this.factory().entity_type;
	}

	getUuid(item: T): string {
		return item.id;
	}

	merge(item: T, options: { setUpdated: boolean } = { setUpdated: true }) {
		const id = item.id || generateId();
		this.moneeeyStore.tags.registerAll(item.tags);
		this.itemsByUuid.set(id, {
			...item,
			entity_type: this.factory().entity_type,
			id,
			created: item.created || currentDateTime(),
			updated_at: options.setUpdated
				? currentDateTime()
				: item.updated_at || currentDateTime(),
		});
	}

	readField(entityId: string, field: keyof T) {
		const current = this.byUuid(entityId) || this.factory(entityId);

		return current[field];
	}

	update(entityId: string, delta: Partial<T>) {
		const current = this.byUuid(entityId) || this.factory(entityId);
		this.merge({ ...current, ...delta });
	}

	remove(item: T) {
		this.itemsByUuid.delete(item.id);
		item.deleted_at = currentDateTime();
	}

	hasKey(uuid: string | undefined) {
		return !isEmpty(uuid) && this.itemsByUuid.has(uuid || "");
	}

	byUuid(uuid: string | undefined): T | undefined {
		return isEmpty(uuid) ? undefined : this.itemsByUuid.get(uuid || "");
	}

	byPredicate(predicate: (item: T) => boolean) {
		return this.all.filter(predicate);
	}

	find(predicate: (item: T) => boolean) {
		return this.all.find((o) => o && predicate(o));
	}

	get all(): T[] {
		return Array.from(this.itemsByUuid.values());
	}

	get ids(): string[] {
		return Array.from(this.itemsByUuid.keys());
	}
}
