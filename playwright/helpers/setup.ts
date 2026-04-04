import type { Page } from "@playwright/test";

/**
 * Clears localStorage and the PouchDB IndexedDB database before each test.
 * Use this in a `test.beforeEach` hook to ensure each test starts clean.
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
