import _ from "lodash";
import { action, computed, makeObservable, observable } from "mobx";
import { currentDateTime } from "./Date";
import { IBaseEntity } from "./Entity";

type UUIDGetter<T> = (item: T) => string;

export default class MappedStore<T extends IBaseEntity> {
  public itemsByUuid = new Map<string, T>()
  protected itemUuids: string[] = [];
  protected getUuid: UUIDGetter<T>;

  constructor(getUuid: UUIDGetter<T>) {
    this.getUuid = getUuid;
    makeObservable(this, {
      itemsByUuid: observable,
      add: action,
      remove: action,
      update: action,
      all: computed,
    })
  }

  add(item: T) {
    const uuid = this.getUuid(item);
    this.itemUuids = [...this.itemUuids, uuid];
    this.update({
      ...item,
      _id: item.entity_type + "-" + uuid,
      created: currentDateTime(),
    });
  }

  remove(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid.delete(uuid)
    this.itemUuids = this.itemUuids.filter((i) => i !== uuid);
    item._deleted = true;
  }

  update(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid.set(uuid, {
      ...item,
      updated: currentDateTime(),
    })
  }

  hasKey(uuid: string) {
    return this.itemsByUuid.has(uuid);
  }

  byUuid(uuid: string) {
    return this.itemsByUuid.get(uuid)
  }

  byPredicate(predicate: (item: T) => boolean) {
    return this.all.filter(predicate)
  }

  find(predicate: (item: T) => boolean) {
    return this
      .itemUuids
      .map(uuid => this.byUuid(uuid))
      .find(o => o && predicate(o));
  }

  get all(): T[] {
    return _(this.itemUuids)
      .map((uuid: string) => this.byUuid(uuid))
      .compact()
      .value()
  }
}
