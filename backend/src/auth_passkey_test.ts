import { authPasskeyInternals } from "./auth_passkey.ts";
import {
	assert,
	assertResponse,
	runServerRequest,
	withSpying,
} from "./test.ts";

Deno.test(async function passkeyRegisterOptionsBadEmail() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/register/options",
		{ email: "not_valid!#email" },
	);
	assertResponse(resp, 400, { error: "bad email" });
});

Deno.test(async function passkeyRegisterOptionsUserExists() {
	await withSpying({
		object: authPasskeyInternals,
		method: "getUserByEmail",
		action: async (stub) => {
			stub.resolves({ email: "test@test.com" });
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/register/options",
				{ email: "test@test.com" },
			);
			assertResponse(resp, 409, { error: "user already exists" });
		},
	});
});

Deno.test(async function passkeyRegisterOptionsSuccess() {
	await withSpying({
		object: authPasskeyInternals,
		method: "getUserByEmail",
		action: async (getUserStub) => {
			getUserStub.resolves(null);
			await withSpying({
				object: authPasskeyInternals,
				method: "generateRegistrationOptions",
				action: async (genStub) => {
					genStub.resolves({ challenge: "test-challenge", rp: {} });
					const { resp } = await runServerRequest(
						"POST",
						"/api/auth/passkey/register/options",
						{ email: "new@test.com" },
					);
					assert.assertEquals(resp.status, 200);
					const body = await resp.json();
					assert.assertEquals(body.options.challenge, "test-challenge");
					assert.assertEquals(typeof body.flowToken, "string");
					assert.assertEquals(body.flowToken.length > 0, true);
				},
			});
		},
	});
});

Deno.test(async function passkeyLoginOptionsBadEmail() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/login/options",
		{ email: "bad!email" },
	);
	assertResponse(resp, 400, { error: "bad email" });
});

Deno.test(async function passkeyLoginOptionsUserNotFound() {
	await withSpying({
		object: authPasskeyInternals,
		method: "getUserByEmail",
		action: async (stub) => {
			stub.resolves(null);
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/login/options",
				{ email: "nobody@test.com" },
			);
			assertResponse(resp, 404, { error: "user not found" });
		},
	});
});

Deno.test(async function passkeyLoginOptionsSuccess() {
	const fakeUser = {
		email: "user@test.com",
		credentials: [{ credentialId: "cred1", transports: ["internal"] }],
	};
	await withSpying({
		object: authPasskeyInternals,
		method: "getUserByEmail",
		action: async (getUserStub) => {
			getUserStub.resolves(fakeUser);
			await withSpying({
				object: authPasskeyInternals,
				method: "generateAuthenticationOptions",
				action: async (genStub) => {
					genStub.resolves({ challenge: "auth-challenge" });
					const { resp } = await runServerRequest(
						"POST",
						"/api/auth/passkey/login/options",
						{ email: "user@test.com" },
					);
					assert.assertEquals(resp.status, 200);
					const body = await resp.json();
					assert.assertEquals(body.options.challenge, "auth-challenge");
					assert.assertEquals(typeof body.flowToken, "string");
				},
			});
		},
	});
});

Deno.test(async function passkeyRegisterVerifyMissingFlowToken() {
	const { resp } = await runServerRequest(
		"POST",
		"/api/auth/passkey/register/verify",
		{ email: "user@test.com", credential: {}, flowToken: "" },
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

Deno.test(async function passkeyInviteInfoSuccess() {
	await withSpying({
		object: authPasskeyInternals,
		method: "findInvite",
		action: async (stub) => {
			stub.resolves({
				user: { database: "db_123" },
				invite: { tokenHash: "abc" },
			});
			const { resp } = await runServerRequest(
				"POST",
				"/api/auth/passkey/invite/info",
				{ token: "good" },
			);
			assertResponse(resp, 200, { valid: true });
		},
	});
});
