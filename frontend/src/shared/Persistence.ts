import { debounce, isArray, isEmpty, isObject, omit } from "lodash";
import { action, makeObservable, observable, observe, toJS } from "mobx";
import PouchDB from "pouchdb";

import type { SyncConfig } from "../entities/Config";

import { asyncProcess } from "../utils/Utils";
import type { EntityType, IBaseEntity } from "./Entity";
import Logger from "./Logger";
import type MappedStore from "./MappedStore";

export enum Status {
	ONLINE = "ONLINE",
	OFFLINE = "OFFLINE",
	DENIED = "DENIED",
	ERROR = "ERROR",
}

export type PouchDBFactoryFn = () => PouchDB.Database;

export const PouchDBFactory = () => new PouchDB("moneeey");

export const PouchDBRemoteFactory = ({ url, username, password }: SyncConfig) =>
	new PouchDB(url, {
		auth: username === "JWT" ? undefined : { username, password },
		fetch: (fetchUrl: string | Request, options?: RequestInit) => {
			if (username === "JWT" && options) {
				if (options.headers instanceof Headers) {
					options.headers.set("Authorization", `Bearer ${password}`);
				} else if (!isArray(options.headers) && isObject(options.headers)) {
					options.headers.Authorization = `Bearer ${password}`;
				} else {
					options.headers = { Authorization: `Bearer ${password}` };
				}
			}

			return PouchDB.fetch(fetchUrl, options);
		},
	});

export class PersistenceMonitor<TEntity extends IBaseEntity> {
	private bypassMonitor = new Set<string>();
	private logger: Logger;

	constructor(
		private persistenceStore: PersistenceStore,
		parent: Logger,
		private store: MappedStore<TEntity>,
	) {
		this.logger = new Logger(store.entityType().toLowerCase(), parent);
		this.monitorLocalChanges();
		this.monitorRemoteChanges();
	}

	persist(item: TEntity, reason: string) {
		const id = item._id;
		if (id && this.bypassMonitor.has(id)) {
			this.logger.log("persist bypass", { id, reason, item });

			return;
		}
		this.logger.log("persist pending", { id, reason, item });
		this.persistenceStore.commit(toJS(item) as unknown as PouchDocument);
	}

	mergeBypassingMonitor(entity: TEntity) {
		try {
			if (entity._id) {
				this.bypassMonitor.add(entity._id);
			}
			this.store.merge(entity, { setUpdated: false });
		} finally {
			if (entity._id) {
				this.bypassMonitor.delete(entity._id);
			}
		}
	}

	private monitorLocalChanges() {
		observe(this.store.itemsByUuid, (changes) => {
			if (changes.type === "add") {
				const newValue = changes.newValue as TEntity;
				this.persist(newValue, "added");
			} else if (changes.type === "update") {
				const newValue = changes.newValue as TEntity;
				const oldValue = changes.oldValue as TEntity;
				if (newValue._rev === oldValue._rev) {
					this.persist(newValue, "updated");
				} else {
					this.logger.log("monitorLocalChanges synced", changes);
				}
			}
		});
	}

	private monitorRemoteChanges() {
		this.persistenceStore.watch(this.store.entityType(), (doc) => {
			this.logger.log("monitorRemoteChanges received", doc);
			this.mergeBypassingMonitor(doc as unknown as TEntity);
		});
	}
}

type PouchDocument = {
	_id: string;
	_rev: string;
	_conflicts?: string[];
	entity_type: EntityType;
	created: string;
	updated: string;
};

type DocumentWatchListener = (doc: PouchDocument) => void;

export default class PersistenceStore {
	public status: Status = Status.OFFLINE;

	private logger: Logger;

	private db: PouchDB.Database;

	private syncing?: PouchDB.Replication.Sync<IBaseEntity>;

	private watchers = new Map<EntityType, Array<DocumentWatchListener>>();

	private commitables = new Map<string, PouchDocument>();

	private refetchables = new Set<string>();

	constructor(dbFactory: PouchDBFactoryFn, parent: Logger) {
		this.logger = new Logger("persistence", parent);
		this.logger.level = "info";
		this.db = dbFactory();

		makeObservable(this, {
			status: observable,
			notifyDocument: action,
		});
	}

	monitor<T extends IBaseEntity>(store: MappedStore<T>) {
		new PersistenceMonitor(this, this.logger, store);
	}

	async fetchAllDocs() {
		const pouchDocs = await this.db.allDocs({
			include_docs: true,
		});
		return pouchDocs.rows.map(({ doc }) => doc);
	}

	async load() {
		try {
			const docs = await this.fetchAllDocs();
			this.logger.info("load", { total: docs.length, docs });
			for (const doc of docs) {
				if (doc) {
					this.handleReceivedDocument(doc as PouchDocument);
				}
			}
		} catch (err) {
			this.logger.error("load error", { err });
		}
	}

	async refetch(documentId: string) {
		const actual = await this.db.get(documentId, { conflicts: true });
		this.logger.log("refetch", { documentId, actual });
		this.handleReceivedDocument(actual as PouchDocument);
	}

	watch(entityType: EntityType, listener: DocumentWatchListener) {
		if (!this.watchers.has(entityType)) {
			this.watchers.set(entityType, []);
		}
		this.watchers.get(entityType)?.push(listener);
	}

	commit(doc: PouchDocument) {
		this.commitables.set(doc._id, doc);
		this.scheduleCommit();
	}

	notifyDocument(doc: PouchDocument) {
		const listeners = this.watchers.get(doc.entity_type) ?? [];
		for (const watcher of listeners) {
			watcher(doc);
		}
	}

	handleReceivedDocument(doc: PouchDocument) {
		for (const conflict of doc._conflicts || []) {
			this.db.remove(doc._id, conflict);
		}
		this.notifyDocument(doc);
	}

	private scheduleCommit = debounce(async () => this.doCommit(), 200);

	doCommit = async () => {
		const objects = Array.from(this.commitables.values());
		this.commitables.clear();
		this.logger.info("commit", objects);
		try {
			await asyncProcess(
				objects,
				async (chunk) => {
					const responses = (await this.db.bulkDocs(
						chunk,
					)) as (PouchDB.Core.Response & PouchDB.Core.Error)[];
					for (const resp of responses) {
						const { error, status, ok, id, rev } = resp;
						const current = objects.find((obj) => obj._id === id);
						if (!current) {
							this.logger.error("sync commit error matching response id", {
								ok,
								id,
								rev,
								status,
								error,
							});
							return;
						}
						if (ok || status === 409) {
							this.refetchables.add(id);
							this.scheduleRefetch();
						} else if (error) {
							this.logger.error("sync commit error on doc", {
								status,
								error,
								current,
							});
						}
					}
				},
				{
					state: { refetch: [] as string[] },
					chunkSize: 20,
					chunkThrottle: 50,
				},
			);
		} catch (err) {
			const error = err as PouchDB.Core.Error;
			this.logger.error("sync commit error", error);
		}
	};

	private scheduleRefetch = debounce(async () => this.doRefetch(), 200);

	doRefetch = async () => {
		const ids = Array.from(this.refetchables.keys());
		this.refetchables.clear();
		for (const id of ids) {
			this.refetch(id);
		}
	};

	truncateAll() {
		this.db.destroy();
	}

	async exportAll(onProgress: (perc: number) => void) {
		const docs = (await this.fetchAllDocs()).map(
			(entity) => toJS(entity) as object,
		);

		const { result } = await asyncProcess(
			docs,
			(chunk, state, percentage) => {
				onProgress(percentage);
				state.result = [...state.result, ...chunk];
			},
			{ state: { result: [] as object[] }, chunkSize: 100, chunkThrottle: 50 },
		);
		return JSON.stringify(result);
	}

	async restoreAll(content: string, onProgress: (perc: number) => void) {
		const entries = JSON.parse(content) as object[];

		return asyncProcess(
			entries,
			(chunk, _result, percentage) => {
				onProgress(percentage);
				for (const line of chunk) {
					const withoutRev = omit(line, ["_rev"]);
					this.commit(withoutRev as PouchDocument);
				}
			},
			{ state: {}, chunkSize: 100, chunkThrottle: 50 },
		);
	}

	sync(remote: SyncConfig) {
		const setStatus = action((status: Status) => {
			if (this.status !== status) {
				this.status = status;
			}
		});

		if (this.syncing) {
			this.syncing.cancel();
		}

		return new Promise((resolve, reject) => {
			if (remote.url && remote.enabled) {
				const remoteDb = PouchDBRemoteFactory(remote);
				this.syncing = this.db
					.sync(remoteDb, { live: true, retry: true, batch_size: 25 })
					.on("active", () => {
						this.logger.info("sync active");
						resolve(setStatus(Status.ONLINE));
					})
					.on("complete", (info) => {
						this.logger.info("sync complete", { info });
						resolve(setStatus(Status.OFFLINE));
					})
					.on("change", (change) => {
						const changedDocIds = change.change.docs.map((doc) => ({
							_id: doc._id,
							_rev: doc._rev,
						}));
						this.logger.info("sync change", { change: changedDocIds });
						for (const changedDocId of changedDocIds) {
							this.refetch(changedDocId._id);
						}
						resolve(setStatus(Status.ONLINE));
					})
					.on("paused", (info) => {
						this.logger.info("sync paused", { info });
						resolve(setStatus(Status.ONLINE));
					})
					.on("denied", (info) => {
						this.logger.warn("sync denied", { info });
						resolve(setStatus(Status.DENIED));
					})
					.on("error", (error) => {
						this.logger.error("sync error", { error });
						reject(setStatus(Status.ERROR));
					}) as typeof this.syncing;
			} else {
				resolve(setStatus(Status.OFFLINE));
			}
		});
	}

	resolveConflict(a: Partial<PouchDocument>, b: Partial<PouchDocument>) {
		const revLevel = (rev: string | undefined) =>
			Number.parseInt((rev || "0-").split("-")[0], 10);
		const aRevLevel = revLevel(a._rev);
		const bRevLevel = revLevel(b._rev);

		const resolve = (updated: Partial<PouchDocument>) => {
			const outdated = updated === a ? b : a;
			const _rev = aRevLevel > bRevLevel ? a._rev : b._rev;
			const resolved = { ...outdated, ...updated, _rev } as PouchDocument;
			this.logger.info("resolve conflict", { updated, outdated, resolved });
			this.commit(resolved);
			this.notifyDocument(resolved);
		};
		if (a._rev && !b._rev) {
			return resolve(a);
		}
		if (!a._rev && b._rev) {
			return resolve(b);
		}

		if (!isEmpty(a.updated) && !isEmpty(b.updated)) {
			if ((a.updated || "") > (b.updated || "")) {
				return resolve(a);
			}
			if ((a.updated || "") < (b.updated || "")) {
				return resolve(b);
			}
		}

		if (a._rev && b._rev) {
			if (aRevLevel > bRevLevel) {
				return resolve(a);
			}
			if (bRevLevel > aRevLevel) {
				return resolve(b);
			}
		}

		return resolve(b);
	}
}
