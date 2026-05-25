import { debounce, isEmpty } from "lodash";
import { action, makeObservable, observable, observe, toJS } from "mobx";

import type { SyncConfig } from "../entities/Config";

import { asyncProcess } from "../utils/Utils";
import type { EntityType, IBaseEntity } from "./Entity";
import Logger from "./Logger";
import type MappedStore from "./MappedStore";
import {
	type PlainEntity,
	decryptEntity,
	encryptEntity,
} from "./encryption/codec";
import {
	DEFAULT_DB_NAME,
	ENCRYPTION_META_DOC_ID,
	type LocalDoc,
	LocalStore,
} from "./storage/LocalStore";
import { SyncClient, wsVaultUrl } from "./sync/SyncClient";

export enum Status {
	ONLINE = "ONLINE",
	OFFLINE = "OFFLINE",
	DENIED = "DENIED",
	ERROR = "ERROR",
}

export const LOCAL_DB_NAME = DEFAULT_DB_NAME;

export type LocalStoreFactoryFn = () => LocalStore;

export const LocalStoreFactory: LocalStoreFactoryFn = () =>
	new LocalStore(LOCAL_DB_NAME);

type PersistedEntity = IBaseEntity & Record<string, unknown>;

type DocumentWatchListener = (doc: PersistedEntity) => void;

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
		const id = item.id;
		if (id && this.bypassMonitor.has(id)) {
			this.logger.log("persist bypass", { id, reason, item });
			return;
		}
		this.logger.log("persist pending", { id, reason, item });
		this.persistenceStore.commit(toJS(item) as PersistedEntity);
	}

	mergeBypassingMonitor(entity: TEntity) {
		try {
			if (entity.id) this.bypassMonitor.add(entity.id);
			this.store.merge(entity, { setUpdated: false });
		} finally {
			if (entity.id) this.bypassMonitor.delete(entity.id);
		}
	}

	private monitorLocalChanges() {
		observe(this.store.itemsByUuid, (changes) => {
			if (changes.type === "add" || changes.type === "update") {
				this.persist(changes.newValue as TEntity, changes.type);
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

export default class PersistenceStore {
	public status: Status = Status.OFFLINE;

	private logger: Logger;
	private localStore: LocalStore;
	private syncClient: SyncClient | null = null;
	private currentSync: SyncConfig | null = null;
	private dataKey: CryptoKey | null = null;
	private watchers = new Map<EntityType, Array<DocumentWatchListener>>();
	private pendingByDocId = new Map<string, PersistedEntity>();

	constructor(localStore: LocalStore, parent: Logger) {
		this.logger = new Logger("persistence", parent);
		this.logger.level = "info";
		this.localStore = localStore;

		makeObservable(this, {
			status: observable,
			notifyDocument: action,
		});
	}

	setDataKey(key: CryptoKey) {
		this.dataKey = key;
	}

	getDataKey() {
		return this.dataKey;
	}

	getLocalStore(): LocalStore {
		return this.localStore;
	}

	monitor<T extends IBaseEntity>(store: MappedStore<T>) {
		new PersistenceMonitor(this, this.logger, store);
	}

	async fetchAllDocs(): Promise<PersistedEntity[]> {
		await this.localStore.open();
		const records = (await this.localStore.allDocs()).filter(
			(r) => r.id !== ENCRYPTION_META_DOC_ID,
		);
		if (!this.dataKey) return [];
		const key = this.dataKey;
		const decoded = await Promise.all(
			records.map(async (r) => {
				try {
					return (await decryptEntity<PlainEntity>(
						r,
						key,
					)) as unknown as PersistedEntity;
				} catch (err) {
					this.logger.warn("failed to decrypt doc", { id: r.id, err });
					return null;
				}
			}),
		);
		return decoded.filter((d): d is PersistedEntity => d !== null);
	}

	async load() {
		try {
			await this.localStore.open();
			const docs = await this.fetchAllDocs();
			this.logger.info("load", { total: docs.length });
			for (const doc of docs) {
				this.handleReceivedDocument(doc);
			}
		} catch (err) {
			this.logger.error("load error", { err });
		}
	}

	watch(entityType: EntityType, listener: DocumentWatchListener) {
		if (!this.watchers.has(entityType)) {
			this.watchers.set(entityType, []);
		}
		this.watchers.get(entityType)?.push(listener);
	}

	commit(doc: PersistedEntity) {
		if (!doc.id) return;
		this.pendingByDocId.set(doc.id, doc);
		this.scheduleFlush();
	}

	async flush() {
		this.scheduleFlush.cancel();
		await this.doFlush();
		await this.syncClient?.flush();
	}

	notifyDocument(doc: PersistedEntity) {
		const type = doc.entity_type as EntityType;
		const listeners = this.watchers.get(type) ?? [];
		for (const watcher of listeners) {
			watcher(doc);
		}
	}

	handleReceivedDocument(doc: PersistedEntity) {
		this.notifyDocument(doc);
	}

	private scheduleFlush = debounce(async () => this.doFlush(), 200);

	private async doFlush() {
		if (!this.dataKey) return;
		const dataKey = this.dataKey;
		const docs = Array.from(this.pendingByDocId.values());
		this.pendingByDocId.clear();
		try {
			for (const doc of docs) {
				const enc = await encryptEntity(doc as unknown as PlainEntity, dataKey);
				const localDoc = {
					id: enc.id,
					updated_at: enc.updated_at,
					deleted_at: enc.deleted_at,
					data: enc.data,
				};
				await this.localStore.put(localDoc);
				this.syncClient?.enqueue(localDoc);
			}
		} catch (err) {
			this.logger.error("flush error", { err });
		}
	}

	async truncateAll() {
		try {
			await this.syncClient?.stop();
			this.syncClient = null;
			this.currentSync = null;
			await this.localStore.destroy();
		} catch (err) {
			this.logger.error("truncateAll error", { err });
		}
		window.localStorage.clear();
		window.sessionStorage.clear();
		window.location.reload();
	}

	async exportAll(onProgress: (perc: number) => void): Promise<string> {
		const docs = (await this.fetchAllDocs()).map((d) => toJS(d) as object);
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

	async restoreAll(
		content: string,
		onProgress: (perc: number) => void,
	): Promise<void> {
		const entries = JSON.parse(content) as object[];
		await asyncProcess(
			entries,
			(chunk, _state, percentage) => {
				onProgress(percentage);
				for (const line of chunk) {
					this.commit(line as PersistedEntity);
				}
			},
			{ state: {}, chunkSize: 100, chunkThrottle: 50 },
		);
	}

	async sync(remote: SyncConfig): Promise<void> {
		if (this.syncClient && sameSync(this.currentSync, remote)) return;
		if (this.syncClient) {
			await this.syncClient.stop();
			this.syncClient = null;
		}
		this.currentSync = null;
		if (!remote.enabled || !remote.sessionToken) {
			this.setStatus(Status.OFFLINE);
			return;
		}
		this.currentSync = { ...remote };
		const dataKey = this.dataKey;
		this.syncClient = new SyncClient({
			url: wsVaultUrl(),
			sessionToken: remote.sessionToken,
			localStore: this.localStore,
			events: {
				onStatus: (s) => this.setStatus(toPersistenceStatus(s)),
				onChanges: async (docs: LocalDoc[]) => {
					if (!dataKey) return;
					for (const record of docs) {
						if (record.id === ENCRYPTION_META_DOC_ID) continue;
						try {
							const decoded = (await decryptEntity<PlainEntity>(
								record,
								dataKey,
							)) as unknown as PersistedEntity;
							this.handleReceivedDocument(decoded);
						} catch (err) {
							this.logger.warn("decrypt failed on changes", {
								id: record.id,
								err,
							});
						}
					}
				},
			},
		});
		await this.syncClient.start();
	}

	private setStatus = action((status: Status) => {
		if (this.status !== status) this.status = status;
	});

	resolveConflict(
		a: Partial<PersistedEntity>,
		b: Partial<PersistedEntity>,
	): void {
		const winner = pickWinner(a, b);
		if (winner) this.commit(winner as PersistedEntity);
	}
}

const sameSync = (a: SyncConfig | null, b: SyncConfig): boolean =>
	a !== null &&
	a.enabled === b.enabled &&
	a.vaultId === b.vaultId &&
	a.sessionToken === b.sessionToken;

const toPersistenceStatus = (s: string): Status => {
	switch (s) {
		case "online":
			return Status.ONLINE;
		case "denied":
			return Status.DENIED;
		case "error":
			return Status.ERROR;
		default:
			return Status.OFFLINE;
	}
};

const pickWinner = (
	a: Partial<PersistedEntity>,
	b: Partial<PersistedEntity>,
) => {
	const au = a.updated_at;
	const bu = b.updated_at;
	if (au && !bu) return a;
	if (!au && bu) return b;
	if (au && bu) {
		if (au > bu) return a;
		if (bu > au) return b;
	}
	return !isEmpty(a) ? a : b;
};
