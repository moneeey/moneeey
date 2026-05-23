type StoreSpec = {
	name: string;
	keyPath?: string;
};

export type DbSchema = {
	name: string;
	version: number;
	stores: StoreSpec[];
};

const promisifyRequest = <T>(req: IDBRequest<T>): Promise<T> =>
	new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});

const promisifyTx = (tx: IDBTransaction): Promise<void> =>
	new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});

export async function openDb(schema: DbSchema): Promise<IDBDatabase> {
	return await new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(schema.name, schema.version);
		req.onupgradeneeded = () => {
			const db = req.result;
			for (const store of schema.stores) {
				if (!db.objectStoreNames.contains(store.name)) {
					db.createObjectStore(
						store.name,
						store.keyPath ? { keyPath: store.keyPath } : undefined,
					);
				}
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
		req.onblocked = () => reject(new Error("idb open blocked"));
	});
}

export async function getValue<T>(
	db: IDBDatabase,
	store: string,
	key: IDBValidKey,
): Promise<T | undefined> {
	const tx = db.transaction(store, "readonly");
	const result = await promisifyRequest<T | undefined>(
		tx.objectStore(store).get(key),
	);
	await promisifyTx(tx);
	return result;
}

export async function putValue<T>(
	db: IDBDatabase,
	store: string,
	value: T,
	key?: IDBValidKey,
): Promise<void> {
	const tx = db.transaction(store, "readwrite");
	if (key !== undefined) {
		tx.objectStore(store).put(value, key);
	} else {
		tx.objectStore(store).put(value);
	}
	await promisifyTx(tx);
}

export async function deleteValue(
	db: IDBDatabase,
	store: string,
	key: IDBValidKey,
): Promise<void> {
	const tx = db.transaction(store, "readwrite");
	tx.objectStore(store).delete(key);
	await promisifyTx(tx);
}

export async function getAllValues<T>(
	db: IDBDatabase,
	store: string,
): Promise<T[]> {
	const tx = db.transaction(store, "readonly");
	const result = await promisifyRequest<T[]>(tx.objectStore(store).getAll());
	await promisifyTx(tx);
	return result;
}

export async function bulkPutValues<T>(
	db: IDBDatabase,
	store: string,
	values: T[],
): Promise<void> {
	if (values.length === 0) return;
	const tx = db.transaction(store, "readwrite");
	const objectStore = tx.objectStore(store);
	for (const value of values) {
		objectStore.put(value);
	}
	await promisifyTx(tx);
}

export async function clearStore(
	db: IDBDatabase,
	store: string,
): Promise<void> {
	const tx = db.transaction(store, "readwrite");
	tx.objectStore(store).clear();
	await promisifyTx(tx);
}

export async function deleteDatabase(name: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const req = indexedDB.deleteDatabase(name);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
		req.onblocked = () => reject(new Error("delete blocked"));
	});
}
