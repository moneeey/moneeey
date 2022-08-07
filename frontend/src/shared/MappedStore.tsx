import { action, computed, makeObservable, observable } from 'mobx';

import { FieldProps } from '../components/editor/EditorProps';
import { currentDateTime } from './Date';
import { IBaseEntity } from './Entity';

type UUIDGetter<T> = (item: T) => string;

type RecordMap<T, V> = {
  [P in Exclude<keyof T, "toString">]?: V
}

export type SchemaFactory<T extends IBaseEntity, SchemaFactoryProps> = (props: SchemaFactoryProps) => RecordMap<T, FieldProps<any, any, any>>;

export default class MappedStore<T extends IBaseEntity, SchemaFactoryProps> {
  public readonly itemsByUuid = new Map<string, T>();
  public readonly getUuid: UUIDGetter<T>;
  public readonly schema: (props: SchemaFactoryProps) => RecordMap<T, FieldProps<any, any, any>>;
  public readonly factory: (props: SchemaFactoryProps) => T;

  constructor(getUuid: UUIDGetter<T>, factory: (props: SchemaFactoryProps) => T, schema: SchemaFactory<T, SchemaFactoryProps>) {
    this.getUuid = getUuid;
    this.schema = schema;
    this.factory = factory
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
    this.itemsByUuid.set(uuid, {
      ...item,
      _id: item.entity_type + '-' + uuid,
      created: item.created || currentDateTime(),
      updated: options.setUpdated ? currentDateTime() : item.updated || currentDateTime(),
    });
  }

  remove(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid.delete(uuid);
    item._deleted = true;
  }

  hasKey(uuid: string) {
    return this.itemsByUuid.has(uuid);
  }

  byUuid(uuid: string) {
    return this.itemsByUuid.get(uuid);
  }

  byPredicate(predicate: (item: T) => boolean) {
    return this.all.filter(predicate);
  }

  find(predicate: (item: T) => boolean) {
    return this.all.find((o) => o && predicate(o));
  }

  get all(): T[] {
    return Array.from(this.itemsByUuid.values())
  }

  get ids(): string[] {
    return Array.from(this.itemsByUuid.keys())
  }
}
