import { action, computed, makeObservable, observable } from 'mobx';

import { EditorProps } from '../components/editor/EditorProps';
import { currentDateTime } from './Date';
import { IBaseEntity } from './Entity';

type UUIDGetter<T> = (item: T) => string;

type RecordMap<T, V> = {
  [P in Exclude<keyof T, "toString">]?: V
}

export type SchemaFactory<T extends IBaseEntity, SchemaProps> = (props: SchemaProps) => RecordMap<T, EditorProps<any, any, any>>;

export default class MappedStore<T extends IBaseEntity, SchemaProps> {
  public readonly itemsByUuid = new Map<string, T>();
  public readonly getUuid: UUIDGetter<T>;
  public readonly schema: (props: SchemaProps) => RecordMap<T, EditorProps<any, any, any>>;
  public readonly factory: (props: SchemaProps) => T;

  constructor(getUuid: UUIDGetter<T>, factory: (props: SchemaProps) => T, schema: SchemaFactory<T, SchemaProps>) {
    this.getUuid = getUuid;
    this.schema = schema;
    this.factory = factory
    makeObservable(this, {
      itemsByUuid: observable,
      merge: action,
      remove: action,
      all: computed
    });
  }

  merge(item: T) {
    const uuid = this.getUuid(item);
    this.itemsByUuid.set(uuid, {
      ...item,
      _id: item.entity_type + '-' + uuid,
      created: item.created || currentDateTime(),
      updated: currentDateTime(),
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
}
