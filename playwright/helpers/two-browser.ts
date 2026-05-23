import {
	type Browser,
	type BrowserContext,
	type Page,
	chromium,
	firefox,
} from "@playwright/test";

export type TwoBrowser = {
	browserA: Browser;
	browserB: Browser;
	contextA: BrowserContext;
	contextB: BrowserContext;
	pageA: Page;
	pageB: Page;
	close: () => Promise<void>;
};

const launcherByEngine = {
	chromium,
	firefox,
};

export type EngineName = keyof typeof launcherByEngine;

/**
 * Spin up two independent browser instances of the same engine so we can
 * exercise the WebSocket sync protocol with two clients writing to the same
 * vault. Each instance has its own user data dir so their IndexedDB and
 * cookies don't collide.
 */
export async function openTwoBrowsers(
	engine: EngineName,
	baseURL: string,
): Promise<TwoBrowser> {
	const launcher = launcherByEngine[engine];
	const browserA = await launcher.launch();
	const browserB = await launcher.launch();
	const contextA = await browserA.newContext({ baseURL });
	const contextB = await browserB.newContext({ baseURL });
	const pageA = await contextA.newPage();
	const pageB = await contextB.newPage();

	const close = async () => {
		await Promise.allSettled([browserA.close(), browserB.close()]);
	};

	return { browserA, browserB, contextA, contextB, pageA, pageB, close };
}
