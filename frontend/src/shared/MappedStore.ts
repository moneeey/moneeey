import { isEmpty } from "lodash";
import { action, computed, makeObservable, observable } from "mobx";

import { currentDateTime } from "../utils/Date";

import type { IBaseEntity } from "./Entity";
import type MoneeeyStore from "./MoneeeyStore";

type UUIDGetter<T> = (item: T) => string;

export default class MappedStore<T extends IBaseEntity> {
	public readonly itemsByUuid = new Map<string, T>();

	public readonly getUuid: UUIDGetter<T>;

	public readonly factory: (id?: string) => T;

	public readonly moneeeyStore: MoneeeyStore;

	constructor(
		moneeeyStore: MoneeeyStore,
		config: {
			getUuid: UUIDGetter<T>;
			factory: (id?: string) => T;
		},
	) {
		this.getUuid = config.getUuid;
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

	merge(item: T, options: { setUpdated: boolean } = { setUpdated: true }) {
		const uuid = this.getUuid(item);
		this.moneeeyStore.tags.registerAll(item.tags);
		this.itemsByUuid.set(uuid, {
			...item,
			entity_type: this.factory().entity_type,
			_id: `${item.entity_type}-${uuid}`,
			created: item.created || currentDateTime(),
			updated: options.setUpdated
				? currentDateTime()
				: item.updated || currentDateTime(),
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
		const uuid = this.getUuid(item);
		this.itemsByUuid.delete(uuid);
		item._deleted = true;
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
