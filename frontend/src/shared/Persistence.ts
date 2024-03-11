import {
	debounce,
	forEach,
	isArray,
	isEmpty,
	isObject,
	map,
	omit,
	uniqBy,
	values,
} from "lodash";
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

export default class PersistenceStore {
	public status: Status = Status.OFFLINE;

	private db: PouchDB.Database;

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

	private syncing?: PouchDB.Replication.Sync<IBaseEntity>;

	private bypassMonitor = new Set<string>();

	constructor(dbFactory: PouchDBFactoryFn, parent: Logger) {
		this.logger = new Logger("persistence", parent);
		this.logger.level = "info";
		this.db = dbFactory();
		this._commit = debounce(() => this.commit(), 1000);

		makeObservable(this, {
			status: observable,
			sync: action,
		});
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
						this.fetchLatest(changedDocIds);
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

	async fetchLatest(docs: { _id: string; _rev: string }[]) {
		const first = docs.pop();
		if (!first) {
			return;
		}

		const { _id, _rev } = first;
		this.logger.log("fetch latest", { _id, _rev });
		const latest = await this.fetch(_id);
		this.mergeBypassingMonitor(this.stores[latest.entity_type], latest);

		await this.fetchLatest(docs);
	}

	async load() {
		try {
			const docs = await this.db.allDocs({
				include_docs: true,
			});
			this.logger.info("loaded docs", { total: docs.total_rows });
			map(
				[...(docs.rows.map((d) => d.doc) as unknown[] as IBaseEntity[])],
				(entity) => {
					if (entity.entity_type && this.stores[entity.entity_type]) {
						this.mergeBypassingMonitor(this.stores[entity.entity_type], entity);
					}
				},
			);
		} catch (err) {
			this.logger.error("load docs error", { err });
		}
	}

	resolveConflict<EntityType extends IBaseEntity>(
		store: MappedStore<EntityType>,
		a: EntityType,
		b: EntityType,
	) {
		const revLevel = (rev: string | undefined) =>
			Number.parseInt((rev || "0-").split("-")[0], 10);
		const aRevLevel = revLevel(a._rev);
		const bRevLevel = revLevel(b._rev);

		const resolve = (updated: EntityType) => {
			const outdated = updated === a ? b : a;
			const _rev = aRevLevel > bRevLevel ? a._rev : b._rev;
			const resolved = { ...outdated, ...updated, _rev };
			this.logger.info("resolve conflict", { updated, outdated, resolved });
			store.merge(resolved, { setUpdated: true });
			this.persist<EntityType>(
				store,
				store.byUuid(store.getUuid(resolved)) as EntityType,
			);
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

	async commit() {
		const objects = uniqBy(
			this.syncables.map(({ store, uuid }) => {
				const entity = toJS(store.byUuid(uuid)) as unknown as { _id: string };

				return { store, _id: entity._id, entity, uuid };
			}),
			"_id",
		);
		this.syncables = [];
		try {
			return await asyncProcess(
				objects.map((sync) => sync.entity),
				async (chunk) => {
					const responses = await this.db.bulkDocs(chunk);
					map(
						responses,
						async (resp: PouchDB.Core.Response & PouchDB.Core.Error) => {
							const { error, status, ok, id, rev } = resp;
							const current = objects.find((obj) => obj._id === id);
							if (!current) {
								return;
							}
							if (error && status === 409) {
								const actual = await this.fetch(id);
								this.resolveConflict(current.store, current.entity, actual);
							} else if (error) {
								this.logger.error("sync commit error on doc", {
									error,
									current,
								});
							} else if (ok) {
								const entity = { ...current.entity, _rev: rev };
								this.mergeBypassingMonitor(current.store, entity);
							}
						},
					);
				},
				{ state: {}, chunkSize: 50, chunkThrottle: 25 },
			);
		} catch (err) {
			const error = err as PouchDB.Core.Error;
			this.logger.error("sync commit error", error);
		}
	}

	persist<EntityType extends IBaseEntity>(
		store: MappedStore<EntityType>,
		item: EntityType,
	) {
		if (item._id && this.bypassMonitor.has(item._id)) {
			this.logger.log("persist bypass", { uuid: store.getUuid(item), item });

			return;
		}
		this.logger.log("persist", { uuid: store.getUuid(item), item });
		this.syncables.push({ store: store as never, uuid: store.getUuid(item) });
		this._commit();
	}

	async fetch(id: string) {
		const actual = await this.db.get(id, { conflicts: true });
		if (actual._conflicts) {
			forEach(actual._conflicts, (rev) => this.db.remove(id, rev));
		}
		const entity = actual as IBaseEntity;
		this.logger.info("fetch latest", { entity });

		return entity;
	}

	mergeBypassingMonitor<TEntityType extends IBaseEntity>(
		store: MappedStore<TEntityType>,
		entity: TEntityType,
	) {
		try {
			if (entity._id) {
				this.bypassMonitor.add(entity._id);
			}
			store.merge(entity, { setUpdated: false });
		} finally {
			if (entity._id) {
				this.bypassMonitor.delete(entity._id);
			}
		}
	}

	monitor<TEntityType extends IBaseEntity>(
		store: MappedStore<TEntityType>,
		type: EntityType,
	) {
		this.stores[type] = store;
		observe(store.itemsByUuid, (changes) => {
			if (changes.type === "add") {
				this.persist(store, changes.newValue);
			} else if (changes.type === "update") {
				const oldRev = changes.oldValue._rev;
				const newRev = changes.newValue._rev;
				if (oldRev === newRev) {
					this.logger.log("monitor - dirty", changes);
					this.persist(store, changes.newValue);
				} else {
					this.logger.log("monitor - synced", changes);
				}
			}
		});
	}

	async exportAll(onProgress: (perc: number) => void) {
		return (
			await asyncProcess(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				values(this.stores).flatMap((store) =>
					Array.from(store.itemsByUuid.values()),
				),
				(chunk, state, percentage) => {
					onProgress(percentage);
					state.result = `${
						state.result +
						chunk.map((entity) => JSON.stringify(toJS(entity))).join("\n")
					}\n`;
				},
				{ state: { result: "" }, chunkSize: 100, chunkThrottle: 50 },
			)
		).result;
	}

	restoreEntity(entity: { entity_type?: string }) {
		const store = entity.entity_type && this.stores[entity.entity_type];
		if (store) {
			store.merge(omit(entity, ["_rev"]));

			return true;
		}

		return false;
	}

	restoreAll(content: string, onProgress: (perc: number) => void) {
		const entries = content.split("\n");

		return asyncProcess(
			entries,
			(chunk, result, percentage) => {
				onProgress(percentage);
				chunk.forEach((line) => {
					if (line.trim() === "") {
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
			{ state: { errors: [] as string[] }, chunkSize: 100, chunkThrottle: 50 },
		);
	}

	truncateAll() {
		this.db.destroy();
	}
}
