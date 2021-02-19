import Observable from "./Observable";

type UUIDGetter<T> = (item: T) => string;

export default class MappedStore<T> extends Observable<void> {
  protected itemsByUuid: { [_uuid: string]: T } = {};
  protected itemUuids: string[] = [];
  protected getUuid: UUIDGetter<T>;

  constructor(getUuid: UUIDGetter<T>) {
    super();
    this.getUuid = getUuid;
  }

  add(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid = {
      ...this.itemsByUuid,
      [uuid]: item,
    };
    this.itemUuids = [...this.itemUuids, uuid];
    this.dispatch();
  }

  remove(item: T) {
    const uuid = this.getUuid(item);
    delete this.itemsByUuid[uuid];
    this.itemUuids = this.itemUuids.filter((i) => i !== uuid);
    this.dispatch();
  }

  byUuid(uuid: string) {
    return this.itemsByUuid[uuid];
  }

  all() {
    return this.itemUuids.map((uuid: string) => this.itemsByUuid[uuid]);
  }
}
