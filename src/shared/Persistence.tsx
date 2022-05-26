import PouchDB from 'pouchdb';
import { EntityType, IBaseEntity } from './Entity';
import MappedStore from './MappedStore';
import Observable from './Observable';

export enum Status {
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

export default class PersistenceStore extends Observable<PersistenceStore> {
  db: PouchDB.Database;
  entries: IBaseEntity[] = [];
  status: Status = Status.OFFLINE;
  databaseId: string = '';

  constructor() {
    super();
    this.db = new PouchDB('moneeey');
    this.sync();
  }

  async sync() {
    const setStatus = (status: Status) => { this.status = status; this.dispatch(this); };
    return new Promise((resolve, reject) => {
      if (!this.databaseId) return
      this.db.sync('/couchdb/' + this.databaseId, { live: true, retry: true })
        .on('change', () => { resolve(setStatus(Status.ONLINE)) })
        .on('paused', () => { resolve(setStatus(Status.OFFLINE)) })
        .on('denied', () => resolve(setStatus(Status.OFFLINE)))
        .on('error', () => reject(setStatus(Status.OFFLINE)));
    })
  }

  async load() {
    return new Promise((resolve) => {
      this.db
        .allDocs({
          include_docs: true,
        })
        .then((docs) => {
          this.entries = [
            ...((docs.rows.map((d) => d.doc) as unknown[]) as any[]),
          ];
          resolve(this.entries);
        })
    });
  }

  async persist(item: any) {
    return this.db.put(item);
  }

  async fetch(id: string) {
    return this.db.get(id);
  }

  retrieve(type: EntityType) {
    return this.entries.filter((e) => e.entity_type === type);
  }

  monitorChanges(store: MappedStore<any>) {
    store.addListener(o => this.persist(o))
  }
}
