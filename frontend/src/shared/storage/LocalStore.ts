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
	updated_at: string;
	deleted_at: string | null;
	data: string;
};

export type ManifestEntry = {
	id: string;
	updated_at: string;
};

const STORE_DOCUMENTS = "documents";
const STORE_META = "meta";

const META_VAULT_ID = "vault_id";
export const ENCRYPTION_META_DOC_ID = "ENCRYPTION-META";

export const DEFAULT_DB_NAME = "moneeey";
const DB_VERSION = 1;

const schema = (name: string) => ({
	name,
	version: DB_VERSION,
	stores: [{ name: STORE_DOCUMENTS, keyPath: "id" }, { name: STORE_META }],
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

	async getMany(ids: string[]): Promise<LocalDoc[]> {
		const out: LocalDoc[] = [];
		for (const id of ids) {
			const doc = await this.get(id);
			if (doc) out.push(doc);
		}
		return out;
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

	async manifest(): Promise<ManifestEntry[]> {
		const docs = await this.allDocs();
		return docs
			.filter((d) => d.id !== ENCRYPTION_META_DOC_ID)
			.map((d) => ({ id: d.id, updated_at: d.updated_at }));
	}

	async clearDocs(): Promise<void> {
		await clearStore(this.requireDb(), STORE_DOCUMENTS);
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
			updated_at,
			deleted_at: null,
			data,
		});
	}
}
