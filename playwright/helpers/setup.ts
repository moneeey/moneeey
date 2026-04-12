import type { Page } from "@playwright/test";

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
