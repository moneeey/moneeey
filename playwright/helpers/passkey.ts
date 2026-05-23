import type { BrowserContext, Page } from "@playwright/test";

export type VirtualAuthenticator = {
	authenticatorId: string;
	remove: () => Promise<void>;
};

/**
 * Install a CDP virtual authenticator on the given page's context so the
 * WebAuthn ceremony succeeds without a real authenticator.
 *
 * Chromium-only. Firefox and WebKit don't expose this CDP domain; tests that
 * need passkeys should be gated to chromium projects via `test.skip(...)`.
 */
export async function enableVirtualAuthenticator(
	page: Page,
): Promise<VirtualAuthenticator> {
	const context = page.context();
	const browserType = context.browser()?.browserType().name();
	if (browserType !== "chromium") {
		throw new Error(
			`virtual authenticator is chromium-only (got ${browserType})`,
		);
	}
	const client = await context.newCDPSession(page);
	await client.send("WebAuthn.enable");
	const { authenticatorId } = (await client.send(
		"WebAuthn.addVirtualAuthenticator",
		{
			options: {
				protocol: "ctap2",
				transport: "internal",
				hasResidentKey: true,
				hasUserVerification: true,
				isUserVerified: true,
				automaticPresenceSimulation: true,
			},
		},
	)) as { authenticatorId: string };

	return {
		authenticatorId,
		remove: async () => {
			try {
				await client.send("WebAuthn.removeVirtualAuthenticator", {
					authenticatorId,
				});
			} catch {
				/* ignore — context may already be closed */
			}
			await client.detach().catch(() => {
				/* ignore */
			});
		},
	};
}

export const passkeyEngineSupported = (context: BrowserContext): boolean =>
	context.browser()?.browserType().name() === "chromium";
