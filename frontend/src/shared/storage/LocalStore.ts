import type { MetaDoc, MetaStore } from "../encryption/codec";
import {
	bulkPutValues,
	clearStore,
	deleteDatabase,
	deleteValue,
	getAllValues,
	getValue,
	openDb,
	putValue,
} from "./idb";

export type LocalDoc = {
	id: string;
	seq: number;
	updated_at: string;
	deleted_at: string | null;
	data: string;
};

export type OutboxEntry = {
	id: string;
	updated_at: string;
	deleted_at: string | null;
	data: string;
	enqueuedAt: string;
};

const STORE_DOCUMENTS = "documents";
const STORE_META = "meta";
const STORE_OUTBOX = "outbox";

const META_HEAD_SEQ = "head_seq";
const META_VAULT_ID = "vault_id";
export const ENCRYPTION_META_DOC_ID = "ENCRYPTION-META";

export const DEFAULT_DB_NAME = "moneeey";
const DB_VERSION = 1;

const schema = (name: string) => ({
	name,
	version: DB_VERSION,
	stores: [
		{ name: STORE_DOCUMENTS, keyPath: "id" },
		{ name: STORE_META },
		{ name: STORE_OUTBOX, keyPath: "id" },
	],
});

export class LocalStore implements MetaStore {
	private db: IDBDatabase | null = null;

	constructor(public readonly name: string = DEFAULT_DB_NAME) {}

	async open(): Promise<void> {
		if (this.db) return;
		this.db = await openDb(schema(this.name));
	}

	private requireDb(): IDBDatabase {
		if (!this.db) throw new Error("LocalStore not open");
		return this.db;
	}

	async close(): Promise<void> {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}

	async destroy(): Promise<void> {
		if (this.db) {
			try {
				await clearStore(this.db, STORE_DOCUMENTS);
				await clearStore(this.db, STORE_META);
				await clearStore(this.db, STORE_OUTBOX);
			} catch {
				/* best effort — proceed to delete even if clears fail */
			}
		}
		await this.close();
		try {
			await deleteDatabase(this.name);
		} catch {
			/* delete may be blocked by lingering connections; stores were already cleared */
		}
	}

	async get(id: string): Promise<LocalDoc | undefined> {
		return await getValue<LocalDoc>(this.requireDb(), STORE_DOCUMENTS, id);
	}

	async put(doc: LocalDoc): Promise<void> {
		await putValue(this.requireDb(), STORE_DOCUMENTS, doc);
	}

	async bulkPut(docs: LocalDoc[]): Promise<void> {
		await bulkPutValues(this.requireDb(), STORE_DOCUMENTS, docs);
	}

	async delete(id: string): Promise<void> {
		await deleteValue(this.requireDb(), STORE_DOCUMENTS, id);
	}

	async allDocs(): Promise<LocalDoc[]> {
		return await getAllValues<LocalDoc>(this.requireDb(), STORE_DOCUMENTS);
	}

	async clearDocs(): Promise<void> {
		await clearStore(this.requireDb(), STORE_DOCUMENTS);
	}

	async getHeadSeq(): Promise<number> {
		const v = await getValue<number>(
			this.requireDb(),
			STORE_META,
			META_HEAD_SEQ,
		);
		return v ?? 0;
	}

	async setHeadSeq(seq: number): Promise<void> {
		await putValue(this.requireDb(), STORE_META, seq, META_HEAD_SEQ);
	}

	async getVaultId(): Promise<string | undefined> {
		return await getValue<string>(this.requireDb(), STORE_META, META_VAULT_ID);
	}

	async setVaultId(vaultId: string): Promise<void> {
		await putValue(this.requireDb(), STORE_META, vaultId, META_VAULT_ID);
	}

	async getEncryptionMeta(): Promise<MetaDoc | null> {
		const row = await this.get(ENCRYPTION_META_DOC_ID);
		if (!row) return null;
		try {
			return JSON.parse(row.data) as MetaDoc;
		} catch {
			return null;
		}
	}

	async setEncryptionMeta(meta: MetaDoc): Promise<void> {
		const updated_at = new Date().toISOString();
		const data = JSON.stringify(meta);
		await this.put({
			id: ENCRYPTION_META_DOC_ID,
			seq: 0,
			updated_at,
			deleted_at: null,
			data,
		});
		await this.outboxAdd({
			id: ENCRYPTION_META_DOC_ID,
			updated_at,
			deleted_at: null,
			data,
			enqueuedAt: updated_at,
		});
	}

	async outboxAdd(entry: OutboxEntry): Promise<void> {
		await putValue(this.requireDb(), STORE_OUTBOX, entry);
	}

	async outboxList(): Promise<OutboxEntry[]> {
		return await getAllValues<OutboxEntry>(this.requireDb(), STORE_OUTBOX);
	}

	async outboxRemove(id: string): Promise<void> {
		await deleteValue(this.requireDb(), STORE_OUTBOX, id);
	}

	async outboxClear(): Promise<void> {
		await clearStore(this.requireDb(), STORE_OUTBOX);
	}
}
