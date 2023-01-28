import { debounce, forEach, map, omit, uniqBy, values } from 'lodash';
import { action, makeObservable, observable, observe, toJS } from 'mobx';
import PouchDB from 'pouchdb';

import { StorageKind, asyncProcess, getStorage, setStorage } from '../utils/Utils';

import { EntityType, IBaseEntity } from './Entity';
import Logger from './Logger';
import MappedStore from './MappedStore';

export enum Status {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  DENIED = 'DENIED',
  ERROR = 'ERROR',
}

export type RemoteCouchDB = {
  url: string;
  username: string;
  password: string;
};

export type PouchDBFactoryFn = () => PouchDB.Database;

export const PouchDBFactory = () => new PouchDB('moneeey');

export const PouchDBRemoteFactory = ({ url, username, password }: RemoteCouchDB) =>
  new PouchDB(url, { auth: { username, password } });

export default class PersistenceStore {
  public status: Status = Status.OFFLINE;

  public syncRemote: RemoteCouchDB = {
    url: '',
    username: '',
    password: '',
  };

  private db: PouchDB.Database;

  private entries: {
    [_id: string]: IBaseEntity;
  } = {};

  private syncables: {
    uuid: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: MappedStore<any>;
  }[] = [];

  private stores: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [_type: string]: MappedStore<any>;
  } = {};

  private _commit;

  private logger: Logger;

  constructor(dbFactory: PouchDBFactoryFn, parent: Logger) {
    this.logger = new Logger('persistence', parent);
    this.db = dbFactory();
    this._commit = debounce(() => this.commit(), 1000);
    const getConfig = (key: string) => getStorage(key, '', StorageKind.PERMANENT);
    this.syncRemote.url = getConfig('sync_url');
    this.syncRemote.username = getConfig('sync_username');
    this.syncRemote.password = getConfig('sync_password');

    makeObservable(this, {
      status: observable,
      sync: action,
    });
  }

  syncWith(remote: RemoteCouchDB) {
    this.syncRemote = remote;
    const setConfig = (key: string, value: string) => {
      setStorage(key, value, StorageKind.PERMANENT);
    };
    setConfig('sync_url', remote.url);
    setConfig('sync_username', remote.username);
    setConfig('sync_password', remote.password);
    this.sync();
  }

  sync() {
    const setStatus = action((status: Status) => {
      if (this.status !== status) {
        this.status = status;
      }
    });

    return new Promise((resolve, reject) => {
      if (this.syncRemote.url) {
        const remoteDb = PouchDBRemoteFactory(this.syncRemote);
        this.db
          .sync(remoteDb, { live: true, retry: true })
          .on('active', () => {
            this.logger.info('sync active');
            resolve(setStatus(Status.ONLINE));
          })
          .on('complete', (info) => {
            this.logger.info('sync complete', { info });
            resolve(setStatus(Status.OFFLINE));
          })
          .on('change', (change) => {
            const changedDocIds = change.change.docs.map((doc) => ({ _id: doc._id, _rev: doc._rev }));
            this.logger.info('sync change', { change: changedDocIds });
            this.fetchLatest(changedDocIds);
            resolve(setStatus(Status.ONLINE));
          })
          .on('paused', (info) => {
            this.logger.info('sync paused', { info });
            resolve(setStatus(Status.ONLINE));
          })
          .on('denied', (info) => {
            this.logger.warn('sync denied', { info });
            resolve(setStatus(Status.DENIED));
          })
          .on('error', (error) => {
            this.logger.error('sync error', { error });
            reject(setStatus(Status.ERROR));
          });
      } else {
        resolve(setStatus(Status.OFFLINE));
      }
    });
  }

  async fetchLatest(docs: { _id: string; _rev: string }[]) {
    const first = docs.pop();
    if (!first) {
      return;
    }

    const { _id, _rev } = first;
    if (this.entries[_id]?._rev === _rev) {
      this.logger.info('fetch latest skipped', { _id, _rev });
    } else {
      this.logger.info('fetch latest', { _id, _rev });
      const latest = await this.fetch(_id);
      this.stores[latest.entity_type].merge(latest, { setUpdated: false });
    }

    await this.fetchLatest(docs);
  }

  load() {
    return new Promise((resolve) => {
      this.db
        .allDocs({
          include_docs: true,
        })
        .then((docs) => {
          this.logger.info('loaded docs', { total: docs.total_rows });
          map([...(docs.rows.map((d) => d.doc) as unknown[] as IBaseEntity[])], (entity) => {
            if (entity._id) {
              this.entries[entity._id] = entity;
            }
          });
          resolve(this.entries);
        });
    });
  }

  resolveConflict<EntityType extends IBaseEntity>(store: MappedStore<EntityType>, a: EntityType, b: EntityType) {
    const resolve = (updated: EntityType) => {
      const outdated = updated === a ? b : a;
      const resolved = { ...outdated, ...updated };
      this.logger.info('resolve conflict', { updated, outdated, resolved });
      store.merge(resolved, { setUpdated: true });
    };
    if (a._rev && !b._rev) {
      return resolve(a);
    }
    if (!a._rev && b._rev) {
      return resolve(b);
    }
    if (a._rev && b._rev) {
      const revLevel = (rev: string | undefined) => parseInt((rev || '0-').split('-')[0], 10);
      const aRevLevel = revLevel(a._rev);
      const bRevLevel = revLevel(b._rev);
      if (aRevLevel > bRevLevel) {
        return resolve(a);
      } else if (bRevLevel > aRevLevel) {
        return resolve(b);
      }
    }
    if ((a.updated || '') > (b.updated || '')) {
      return resolve(a);
    }

    return resolve(b);
  }

  async commit() {
    const objects = uniqBy(
      this.syncables.map(({ store, uuid }) => {
        const entity = toJS(store.byUuid(uuid)) as unknown as { _id: string };

        return { store, _id: entity._id, entity, uuid };
      }),
      '_id'
    );
    this.syncables = [];
    try {
      const responses = await this.db.bulkDocs(objects.map((sync) => sync.entity));
      map(responses, async (resp: PouchDB.Core.Response & PouchDB.Core.Error) => {
        const { error, status, ok, id, rev } = resp;
        const current = objects.find((obj) => obj._id === id);
        if (!current) {
          return;
        }
        if (error && status === 409) {
          const actual = await this.fetch(id);
          this.resolveConflict(current.store, current.entity, actual);
        } else if (error) {
          this.logger.error('sync commit error on doc', { error, current });
        } else if (ok) {
          const entity = { ...current.entity, _rev: rev };
          if (entity && entity._id) {
            this.entries[entity._id] = entity as IBaseEntity;
          }
          current.store.merge(entity, { setUpdated: false });
        }
      });
    } catch (err) {
      const error = err as PouchDB.Core.Error;
      this.logger.error('sync commit error', error);
    }
  }

  persist<EntityType extends IBaseEntity>(store: MappedStore<EntityType>, item: EntityType) {
    this.logger.log('sync will persist', { uuid: store.getUuid(item), item });
    this.syncables.push({ store: store as never, uuid: store.getUuid(item) });
    if (item && item._id) {
      this.entries[item._id] = item;
    }
    this._commit();
  }

  async fetch(id: string) {
    const actual = await this.db.get(id, { conflicts: true });
    if (actual._conflicts) {
      forEach(actual._conflicts, (rev) => this.db.remove(id, rev));
    }
    const entity = actual as IBaseEntity;
    this.entries[entity._id || ''] = entity;
    this.logger.info('sync fetch latest', { entity });

    return entity;
  }

  retrieve(type: EntityType) {
    return values(this.entries).filter((e) => e.entity_type === type);
  }

  monitor<TEntityType extends IBaseEntity>(store: MappedStore<TEntityType>, type: EntityType) {
    this.stores[type] = store;
    this.retrieve(type).forEach((e) => store.merge(e as TEntityType, { setUpdated: false }));
    observe(store.itemsByUuid, (changes) => {
      if (changes.type === 'add') {
        this.persist(store, changes.newValue);
      } else if (changes.type === 'update') {
        const oldRev = changes.oldValue._rev;
        const newRev = changes.newValue._rev;
        if (oldRev === newRev) {
          this.logger.info('monitor - same rev, will persist', changes);
          this.persist(store, changes.newValue);
        } else {
          this.logger.info('monitor - different rev, not persisting', changes);
        }
      }
    });
  }

  async exportAll(onProgress: (perc: number) => void) {
    return (
      await asyncProcess(
        values(this.entries),
        (chunk, state, percentage) => {
          onProgress(percentage);
          state.result = `${state.result + chunk.map((entity) => JSON.stringify(toJS(entity))).join('\n')}\n`;
        },
        { state: { result: '' }, chunkSize: 100, chunkThrottle: 50 }
      )
    ).result;
  }

  restoreEntity(entity: { entity_type?: string }) {
    const store = entity.entity_type && this.stores[entity.entity_type];
    if (store) {
      store.merge(omit(entity, ['_rev']));

      return true;
    }

    return false;
  }

  restoreAll(content: string, onProgress: (perc: number) => void) {
    const entries = content.split('\n');

    return asyncProcess(
      entries,
      (chunk, result, percentage) => {
        onProgress(percentage);
        chunk.forEach((line) => {
          if (line.trim() === '') {
            return;
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            if (!this.restoreEntity(JSON.parse(line))) {
              result.errors.push(`Unable to restore: ${line}`);
            }
          } catch {
            result.errors.push(`Failed to parse line JSON: ${line}`);
          }
        });
      },
      { state: { errors: [] as string[] }, chunkSize: 100, chunkThrottle: 50 }
    );
  }

  truncateAll() {
    this.db.destroy();
  }
}
