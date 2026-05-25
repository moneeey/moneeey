import { authPasskeyInternals } from "./auth_passkey.ts";
import {
	assert,
	assertResponse,
	runServerRequest,
	withSpying,
} from "./test.ts";

Deno.test(async function passkeyRegisterOptionsRejectsEmptyDisplayName() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/register/options",
		{ displayName: "  " },
	);
	assertResponse(resp, 400, { error: "bad display name" });
});

Deno.test(async function passkeyRegisterOptionsRejectsTooLong() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/register/options",
		{ displayName: "x".repeat(100) },
	);
	assertResponse(resp, 400, { error: "bad display name" });
});

Deno.test(async function passkeyRegisterOptionsSuccess() {
	await withSpying({
		object: authPasskeyInternals,
		method: "generateRegistrationOptions",
		action: async (genStub) => {
			genStub.resolves({ challenge: "test-challenge", rp: {} });
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/register/options",
				{ displayName: "Alice" },
			);
			assert.assertEquals(resp.status, 200);
			const body = await resp.json();
			assert.assertEquals(body.options.challenge, "test-challenge");
			assert.assertEquals(typeof body.flowToken, "string");
			assert.assertEquals(body.flowToken.length > 0, true);
		},
	});
});

Deno.test(async function passkeyLoginOptionsReturnsDiscoverableChallenge() {
	await withSpying({
		object: authPasskeyInternals,
		method: "generateAuthenticationOptions",
		action: async (genStub) => {
			genStub.resolves({ challenge: "auth-challenge" });
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/login/options",
				{},
			);
			assert.assertEquals(resp.status, 200);
			const body = await resp.json();
			assert.assertEquals(body.options.challenge, "auth-challenge");
			assert.assertEquals(typeof body.flowToken, "string");
		},
	});
});

Deno.test(async function passkeyRegisterVerifyMissingFlowToken() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/register/verify",
		{ credential: {}, flowToken: "" },
	);
	assertResponse(resp, 500, { error: "internal server error" });
});

Deno.test(async function passkeyInviteCreateNotAuthenticated() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/invite/create",
		{},
	);
	assertResponse(resp, 401, { error: "not authenticated" });
});

Deno.test(async function passkeyInviteInfoNotFound() {
	await withSpying({
		object: authPasskeyInternals,
		method: "findInvite",
		action: async (stub) => {
			stub.resolves(null);
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/invite/info",
				{ token: "bad-token" },
			);
			assertResponse(resp, 404, { error: "invite not found" });
		},
	});
});

Deno.test(async function passkeyInviteAcceptNotAuthenticated() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/invite/accept",
		{ token: "anything" },
	);
	assertResponse(resp, 401, { error: "not authenticated" });
});

Deno.test(async function passkeyInviteInfoSuccess() {
	await withSpying({
		object: authPasskeyInternals,
		method: "findInvite",
		action: async (stub) => {
			stub.resolves({
				tokenHash: "abc",
				vaultId: "v1",
				ownerUserId: "u1",
				expiresAt: new Date(Date.now() + 60_000).toISOString(),
				redeemedBy: null,
				createdAt: new Date().toISOString(),
			});
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/invite/info",
				{ token: "v1.good" },
			);
			assertResponse(resp, 200, { valid: true });
		},
	});
});

Deno.test(async function passkeyLoginVerifyCredentialNotFound() {
	await withSpying({
		object: authPasskeyInternals,
		method: "getUserByCredentialId",
		action: async (stub) => {
			stub.resolves(null);
			const flow = await runServerRequest(
				"POST",
				"/api/auth/passkey/login/options",
				{},
			);
			const flowBody = await flow.resp.json();
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/login/verify",
				{ credential: { id: "unknown" }, flowToken: flowBody.flowToken },
			);
			assertResponse(resp, 400, { error: "credential not found" });
		},
	});
});
