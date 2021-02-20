import PouchDB from "pouchdb";
import { EntityType, IBaseEntity } from "./Entity";
import MappedStore, { MappedStoreObservable } from "./MappedStore";

export default class PersistenceStore {
  db: PouchDB.Database;
  entries: IBaseEntity[] = [];

  constructor() {
    this.db = new PouchDB(
      "http://fernando:dev@localhost:3000/userdb-6665726e616e646f"
    );
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
        });
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
    store.addObserver(({ updated }) => {
      this.persist(updated);
    });
  }
}
