const MONEEEY_DB_PREFIX = "moneeey";
const TAB_VAULT_KEY = "tabVaultId";
const LAST_VAULT_KEY = "lastVaultId";

const withTimeout = async <T>(
	op: Promise<T>,
	ms: number,
): Promise<T | undefined> => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<undefined>((resolve) => {
		timer = setTimeout(() => resolve(undefined), ms);
	});
	try {
		return await Promise.race([op, timeout]);
	} finally {
		if (timer) clearTimeout(timer);
	}
};

const wipeIndexedDbs = async (): Promise<void> => {
	const idb = globalThis.indexedDB as IDBFactory & {
		databases?: () => Promise<{ name?: string }[]>;
	};
	const dbs = (await idb.databases?.()) ?? [];
	const names = new Set<string>();
	for (const db of dbs) {
		if (db.name?.startsWith(MONEEEY_DB_PREFIX)) names.add(db.name);
	}
	await Promise.all(
		Array.from(names).map(
			(name) =>
				new Promise<void>((resolve) => {
					const req = globalThis.indexedDB.deleteDatabase(name);
					req.onsuccess = () => resolve();
					req.onerror = () => resolve();
					req.onblocked = () => resolve();
				}),
		),
	);
};

const clearWebStorage = (): void => {
	try {
		globalThis.sessionStorage?.removeItem(TAB_VAULT_KEY);
	} catch {}
	try {
		globalThis.localStorage?.removeItem(LAST_VAULT_KEY);
	} catch {}
};

export type SignOutOptions = {
	flush?: () => Promise<void>;
	flushTimeoutMs?: number;
};

export async function signOut(opts: SignOutOptions = {}): Promise<void> {
	const { flush, flushTimeoutMs = 2_000 } = opts;
	if (flush) {
		await withTimeout(flush(), flushTimeoutMs);
	}
	try {
		await fetch("/api/auth/logout", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: "{}",
		});
	} catch {}
	clearWebStorage();
	await wipeIndexedDbs();
	globalThis.location?.replace("/");
}
