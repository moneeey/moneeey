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
    this.update({ ...item, _id: item.entity_type + "-" + uuid });
  }

  remove(item: T) {
    const uuid = this.getUuid(item);
    delete this.itemsByUuid[uuid];
    this.itemUuids = this.itemUuids.filter((i) => i !== uuid);
    item._deleted = true;
    this._dispatch(item);
  }

  update(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid[uuid] = item;
    this._dispatch(item);
  }

  private _dispatch(item: T) {
    this.dispatch({ store: this, updated: item });
  }

  byUuid(uuid: string) {
    return this.itemsByUuid[uuid];
  }

  all() {
    return this.itemUuids.map((uuid: string) => this.itemsByUuid[uuid]);
  }
}
