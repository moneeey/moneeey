import { assertResponse, runServerRequest } from "./test.ts";

Deno.test(async function apiAuth() {
	const { resp } = await runServerRequest("GET", "/api/auth");

	assertResponse(resp, 200, {
		hello: "Welcome to Moneeey AuthAPI",
	});
});
