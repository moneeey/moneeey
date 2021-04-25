import { currentDateTime } from "./Date";
import { IBaseEntity } from "./Entity";
import Observable from "./Observable";

type UUIDGetter<T> = (item: T) => string;

export type MappedStoreObservable<T extends IBaseEntity> = {
  store: MappedStore<T>;
  updated: T;
};

export default class MappedStore<T extends IBaseEntity> extends Observable<
  MappedStoreObservable<T>
> {
  protected itemsByUuid: { [_uuid: string]: T } = {};
  protected itemUuids: string[] = [];
  protected getUuid: UUIDGetter<T>;

  constructor(getUuid: UUIDGetter<T>) {
    super();
    this.getUuid = getUuid;
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
    delete this.itemsByUuid[uuid];
    this.itemUuids = this.itemUuids.filter((i) => i !== uuid);
    item._deleted = true;
    this.dispatchItem(item);
  }

  update(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid[uuid] = {
      ...item,
      updated: currentDateTime(),
    };
    this.dispatchItem(item);
  }

  protected dispatchItem(item: T) {
    this.dispatch({ store: this, updated: item });
  }

  hasKey(uuid: string) {
    return uuid in this.itemsByUuid;
  }

  byUuid(uuid: string) {
    return this.itemsByUuid[uuid];
  }

  byPredicate(predicate: (item: T) => boolean) {
    return this
      .itemUuids
      .filter(uuid => this.hasKey(uuid))
      .map(uuid => this.byUuid(uuid))
      .filter(predicate);
  }

  all() {
    return this.itemUuids.map((uuid: string) => this.itemsByUuid[uuid]);
  }
}
