import type { Page } from "@playwright/test";

/** Navigates to `/` and clears localStorage + PouchDB IndexedDB.
 * Deletes both the legacy (pre-encryption) `_pouch_moneeey` database and the
 * current encrypted mirror `_pouch_moneeey-encrypted` so that subsequent
 * reloads land on the encryption setup screen. */
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
		window.indexedDB.deleteDatabase("_pouch_moneeey-encrypted");
	});
}
