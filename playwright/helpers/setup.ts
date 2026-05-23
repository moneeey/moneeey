import type { Page } from "@playwright/test";

export async function resetAppState(page: Page) {
	await page.goto("/");
	await page.evaluate(() => {
		while (window.localStorage.length) {
			const key = window.localStorage.key(0);
			if (key) window.localStorage.removeItem(key);
		}
		window.indexedDB.deleteDatabase("moneeey");
	});
}

export function uniqueTestEmail(prefix = "u"): string {
	const slug = Math.random().toString(36).slice(2, 10);
	return `${prefix}-${Date.now()}-${slug}@playwright.local`;
}
