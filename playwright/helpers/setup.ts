import type { Page } from "@playwright/test";

/**
 * Clears localStorage and the PouchDB IndexedDB database before each test.
 * Use this in a `test.beforeEach` hook (or via the `seededPage`/`wizardPage`
 * fixtures) to ensure each test starts clean.
 *
 * Note: the app currently runs PouchDB with `pouchdb-adapter-memory` so
 * there's no IndexedDB to wipe in practice — the `deleteDatabase` call is
 * a no-op today and is kept as a safety net for when the app eventually
 * migrates to a persistent adapter.
 */
export async function resetAppState(page: Page) {
	await page.goto("/");
	await page.evaluate(() => {
		while (window.localStorage.length) {
			const key = window.localStorage.key(0);
			if (key) {
				window.localStorage.removeItem(key);
			}
		}
		window.indexedDB.deleteDatabase("_pouch_moneeey");
	});
}
