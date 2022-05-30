import _, { map, uniqBy } from 'lodash';
import { makeObservable, observable, observe, toJS } from 'mobx';
import PouchDB from 'pouchdb';

import { EntityType, IBaseEntity } from './Entity';
import MappedStore from './MappedStore';

export enum Status {
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

export default class PersistenceStore {
  db: PouchDB.Database;
  entries: IBaseEntity[] = [];
  status: Status = Status.OFFLINE;
  databaseId: string = '';
  syncables: ({
    uuid: string;
    store: MappedStore<any, any>
  })[] = [];
  private _commit
  private isCommiting = false

  constructor() {
    this.db = new PouchDB('moneeey');
    this.sync();
    this._commit = _.debounce(this.commit, 1000)

    makeObservable(this, {
      status: observable,
      databaseId: observable
    });
  }

  async sync() {
    const setStatus = (status: Status) => {
      this.status = status;
    };
    return new Promise((resolve, reject) => {
      if (!this.databaseId) return;
      this.db
        .sync('/couchdb/' + this.databaseId, { live: true, retry: true })
        .on('change', () => {
          resolve(setStatus(Status.ONLINE));
        })
        .on('paused', () => {
          resolve(setStatus(Status.OFFLINE));
        })
        .on('denied', () => resolve(setStatus(Status.OFFLINE)))
        .on('error', () => reject(setStatus(Status.OFFLINE)));
    });
  }

  async load() {
    return await new Promise((resolve) => {
      this.db
        .allDocs({
          include_docs: true
        })
        .then((docs) => {
          this.entries = [...(docs.rows.map((d) => d.doc) as unknown[] as any[])];
          resolve(this.entries);
        });
    });
  }

  async commit() {
    try {
      this.isCommiting = true
      const objects = uniqBy(
        this.syncables.map(({ store, uuid }) => {
          const entity = toJS(store.byUuid(uuid))
          return { store, _id: entity._id, entity, uuid };
        }),
        '_id'
      );
      this.syncables = []
      try {
        const updated = await this.db.bulkDocs(objects.map(sync => sync.entity));
        map(updated, (resp: PouchDB.Core.Response & PouchDB.Core.Error) => {
          if (resp.error) {
            console.error('Sync Commit error', { resp })
          } else if (resp.ok) {
            const updated = objects.find(obj => obj._id === resp.id)
            if (updated) {
              const entity = { ...updated.entity, _rev: resp.rev }
              console.info('Sync Commit success', { entity })
              updated.store.merge(entity);
            }
          }
        })
      } catch(err) {
        const error = err as PouchDB.Core.Error
        console.error(error)
      }
    } finally {
      this.isCommiting = false
    }
  }

  persist(store: MappedStore<any, any>, item: IBaseEntity) {
    if (!this.isCommiting) {
      this.syncables.push({ store, uuid: store.getUuid(item) })
      this._commit()
    }
  }

  async fetch(id: string) {
    return await this.db.get(id);
  }

  retrieve(type: EntityType) {
    return this.entries.filter((e) => e.entity_type === type);
  }

  monitor(store: MappedStore<any, any>, type: EntityType) {
    this.retrieve(type).forEach((e) => store.merge(e));
    observe(store.itemsByUuid, (changes) => {
      if (changes.type === 'add' || changes.type === 'update') {
        const entity = changes.newValue
        this.persist(store, entity)
      }
    });
  }
}
