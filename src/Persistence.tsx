import PouchDB from "pouchdb";
import {EntityType, IBaseEntity} from "./Entity";
import MappedStore from "./MappedStore";
import Observable from "./Observable";

export enum Status {
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

export default class PersistenceStore extends Observable<PersistenceStore> {
  db: PouchDB.Database;
  entries: IBaseEntity[] = [];
  status: Status = Status.OFFLINE;

  constructor() {
    super();
    this.db = new PouchDB('moneeey');
    this.sync();
  }

  async sync() {
    const fromLocalstorage = (key: string) => {
      let v = window.localStorage.getItem(key) || window.prompt(key) || '';
      window.localStorage.setItem(key, v);
      return v;
    }
    const host = 'couch.k8s.baroni.tech';
    const username = fromLocalstorage('ADMIN_USERNAME');
    const password = fromLocalstorage('ADMIN_PASSWORD');
    const database = 'accounts';
    const remote = `https://${username}:${password}@${host}/${database}`;
    const setStatus = (status: Status) => { this.status = status; this.dispatch(this); };
    return new Promise((resolve, reject) => this.db.sync(remote, { live: true, retry: true })
      .on('complete', () => resolve(setStatus(Status.ONLINE)))
      .on('error', () => reject(setStatus(Status.OFFLINE))));
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
    store.addObserver(({updated}) => {
      this.persist(updated);
    });
  }
}
