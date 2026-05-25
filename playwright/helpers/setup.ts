import type { Page } from "@playwright/test";

export async function resetAppState(page: Page) {
	await page.goto("/");
	await page.evaluate(async () => {
		while (window.localStorage.length) {
			const key = window.localStorage.key(0);
			if (key) window.localStorage.removeItem(key);
		}
		try {
			window.sessionStorage.clear();
		} catch {
			/* ignore */
		}
		const idb = window.indexedDB as IDBFactory & {
			databases?: () => Promise<{ name?: string }[]>;
		};
		const dbs = (await idb.databases?.()) ?? [];
		const names = new Set<string>(["moneeey"]);
		for (const db of dbs) {
			if (db.name?.startsWith("moneeey")) names.add(db.name);
		}
		for (const name of names) {
			window.indexedDB.deleteDatabase(name);
		}
	});
}

export function uniqueTestDisplayName(prefix = "u"): string {
	const slug = Math.random().toString(36).slice(2, 10);
	return `playwright-test-${prefix}-${Date.now()}-${slug}`;
}
