import { authPasskeyInternals } from "./auth_passkey.ts";
import {
	assert,
	assertResponse,
	runServerRequest,
	withSpying,
} from "./test.ts";

function assertChallengeCookie(resp: Response, hasToken: boolean) {
	return assert.assertEquals(
		!!resp.headers
			.getSetCookie()
			.find((cookie) => cookie.startsWith("webauthnChallenge=")),
		hasToken,
	);
}

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
					assert.assertEquals(body.challenge, "test-challenge");
					assertChallengeCookie(resp, true);
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
					assert.assertEquals(body.challenge, "auth-challenge");
					assertChallengeCookie(resp, true);
				},
			});
		},
	});
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
				invite: { token: "good" },
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
