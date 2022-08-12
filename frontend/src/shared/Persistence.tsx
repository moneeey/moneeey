import _, { map, omit, uniqBy, values } from 'lodash'
import { makeObservable, observable, observe, toJS } from 'mobx'
import PouchDB from 'pouchdb'
import { asyncProcess } from '../utils/Utils'

import { EntityType, IBaseEntity } from './Entity'
import MappedStore from './MappedStore'

export enum Status {
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

export default class PersistenceStore {
  public status: Status = Status.OFFLINE
  public databaseId = ''
  private db: PouchDB.Database
  private entries: {
    [_id: string]: IBaseEntity;
  } = {}
  private syncables: ({
    uuid: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: MappedStore<any>;
  })[] = []
  private stores: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [_type: string]: MappedStore<any>;
  } = {}
  private _commit

  constructor() {
    this.db = new PouchDB('moneeey')
    this.sync()
    this._commit = _.debounce(this.commit, 1000)

    makeObservable(this, {
      status: observable,
      databaseId: observable
    })
  }

  async sync() {
    const setStatus = (status: Status) => {
      this.status = status
    }
    return new Promise((resolve, reject) => {
      if (!this.databaseId) return
      this.db
        .sync('/couchdb/' + this.databaseId, { live: true, retry: true })
        .on('change', () => {
          resolve(setStatus(Status.ONLINE))
        })
        .on('paused', () => {
          resolve(setStatus(Status.OFFLINE))
        })
        .on('denied', () => resolve(setStatus(Status.OFFLINE)))
        .on('error', () => reject(setStatus(Status.OFFLINE)))
    })
  }

  async load() {
    return await new Promise((resolve) => {
      this.db
        .allDocs({
          include_docs: true
        })
        .then((docs) => {
          map([...(docs.rows.map((d) => d.doc) as unknown[] as IBaseEntity[])], entity => {
            if (entity._id) this.entries[entity._id] = entity
          })
          resolve(this.entries)
        })
    })
  }

  async commit() {
    const objects = uniqBy(
      this.syncables.map(({ store, uuid }) => {
        const entity = toJS(store.byUuid(uuid)) as unknown as {_id: string}
        return { store, _id: entity._id, entity, uuid }
      }),
      '_id'
    )
    this.syncables = []
    try {
      const responses = await this.db.bulkDocs(objects.map((sync) => sync.entity))
      map(responses, async (resp: PouchDB.Core.Response & PouchDB.Core.Error) => {
        const { error, status, ok, id, rev } = resp
        const current = objects.find((obj) => obj._id === id)
        if (!current) return
        if (error && status === 409) {
          const actual = await this.fetch(id)
          console.error('Sync Commit conflict', { resp, current, actual })
          current.store.merge(actual, { setUpdated: false })
        } else if (error) {
          console.error('Sync Commit error', { error, current })
        } else if (ok) {
          const entity = { ...current.entity, _rev: rev }
          console.info('Sync Commit success', { entity })
          if (entity && entity._id) this.entries[entity._id] = entity as IBaseEntity
          current.store.merge(entity, { setUpdated: false })
        }
      })
    } catch (err) {
      const error = err as PouchDB.Core.Error
      console.error(error)
    }
  }

  persist<EntityType extends IBaseEntity>(store: MappedStore<EntityType>, item: EntityType) {
    console.log('Sync will persist', { item })
    this.syncables.push({ store: store as never, uuid: store.getUuid(item) })
    if (item && item._id) this.entries[item._id] = item
    this._commit()
  }

  async fetch(id: string) {
    const entity = await this.db.get(id, { conflicts: true })
    if (entity._conflicts) {
      await map(entity._conflicts, async rev => {
        await this.db.remove(id, rev)
      })
    }
    this.entries[entity._id] = entity as IBaseEntity
    return entity
  }

  retrieve(type: EntityType) {
    return values(this.entries).filter((e) => e.entity_type === type)
  }

  monitor<TEntityType extends IBaseEntity>(store: MappedStore<TEntityType>, type: EntityType) {
    this.stores[type] = store
    this.retrieve(type).forEach((e) => store.merge(e as TEntityType))
    observe(store.itemsByUuid, (changes) => {
      if (changes.type === 'add') {
        this.persist(store, changes.newValue)
      } else if (changes.type === 'update') {
        const oldRev = changes.oldValue._rev
        const newRev = changes.newValue._rev
        if (oldRev === newRev) {
          console.info('Rev update, will persist', changes)
          this.persist(store, changes.newValue)
        } else {
          console.info('Ref changed, skip persist', changes)
        }
      }
    })
  }

  exportAll(onProgress: (perc: number) => void) {
    return asyncProcess(values(this.entries), (chunk, result, _chunks, tasks, tasksTotal) => {
      onProgress(Math.round((tasks / tasksTotal) * 100))
      result.data = result.data + chunk.map(entity => JSON.stringify(toJS(entity))).join('\n') + '\n'
    }, { data: '' }, 10, 50)
  }

  restoreEntity(entity: { entity_type?: string }) {
    const store = entity['entity_type'] && this.stores[entity['entity_type']]
    if (store) {
      store.merge(omit(entity, ['_rev']))
      return true
    }
    return false
  }

  restoreAll(content: string, onProgress: (perc: number) => void) {
    const entries = content.split('\n')
    return asyncProcess(entries, (chunk, result, _chunks, tasks, tasksTotal) => {
      onProgress(Math.round((tasks / tasksTotal) * 100))
      chunk.forEach(line => {
        try {
          const entity = JSON.parse(line)
          if (!this.restoreEntity(entity)) {
            result.errors.push('Unknown entity type "' + entity['entity_type'] + '": ' + line)
          }
        } catch {
          result.errors.push('Failed to parse line JSON: ' + line)
        }
      })
    }, { errors: [] as string[] }, 10, 50)
  }

  truncateAll() {
    this.db.destroy()
  }
}
