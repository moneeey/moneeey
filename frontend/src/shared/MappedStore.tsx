import { isEmpty } from 'lodash'
import { action, computed, makeObservable, observable } from 'mobx'

import { FieldProps } from '../components/editor/EditorProps'
import { currentDateTime } from '../utils/Date'
import { IBaseEntity } from './Entity'
import MoneeeyStore from './MoneeeyStore'

type UUIDGetter<T> = (item: T) => string;

type RecordMap<T, V> = {
  [P in Exclude<keyof T, 'toString'>]?: V
}

export type SchemaFactory<T extends IBaseEntity> = () => RecordMap<T, FieldProps<never>>;

export default class MappedStore<T extends IBaseEntity> {
  public readonly itemsByUuid = new Map<string, T>()
  public readonly getUuid: UUIDGetter<T>
  public readonly schema: () => RecordMap<T, FieldProps<never>>
  public readonly factory: () => T
  public readonly moneeeyStore: MoneeeyStore

  constructor(moneeeyStore: MoneeeyStore, getUuid: UUIDGetter<T>, factory: () => T, schema: SchemaFactory<T>) {
    this.getUuid = getUuid
    this.schema = schema
    this.factory = factory
    this.moneeeyStore = moneeeyStore
    makeObservable(this, {
      itemsByUuid: observable,
      merge: action,
      remove: action,
      all: computed,
      ids: computed,
    })
  }

  merge(item: T, options: { setUpdated: boolean } = { setUpdated: true }) {
    const uuid = this.getUuid(item)
    this.moneeeyStore.tags.registerAll(item.tags)
    this.itemsByUuid.set(uuid, {
      ...item,
      _id: item.entity_type + '-' + uuid,
      created: item.created || currentDateTime(),
      updated: options.setUpdated ? currentDateTime() : item.updated || currentDateTime(),
    })
  }

  remove(item: T) {
    const uuid = this.getUuid(item)
    this.itemsByUuid.delete(uuid)
    item._deleted = true
  }

  hasKey(uuid: string | undefined) {
    return !isEmpty(uuid) && this.itemsByUuid.has(uuid||'')
  }

  byUuid(uuid: string | undefined) {
    return !isEmpty(uuid) ? this.itemsByUuid.get(uuid||'') : undefined
  }

  byPredicate(predicate: (item: T) => boolean) {
    return this.all.filter(predicate)
  }

  find(predicate: (item: T) => boolean) {
    return this.all.find((o) => o && predicate(o))
  }

  get all(): T[] {
    return Array.from(this.itemsByUuid.values())
  }

  get ids(): string[] {
    return Array.from(this.itemsByUuid.keys())
  }
}
