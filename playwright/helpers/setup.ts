import type { Page } from "@playwright/test";

/** Navigates to `/` and clears localStorage + PouchDB IndexedDB. Deletes
 * the local `_pouch_moneeey` database so that subsequent reloads land on
 * the encryption choose-setup screen. (The pre-encryption refactor also
 * left a `_pouch_moneeey-encrypted` database around for historical
 * compatibility; we still delete it so environments that ran older
 * versions don't accidentally resurrect anything.) */
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
