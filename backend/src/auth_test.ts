import { assertResponse, runServerRequest, test } from "./test.ts";

test(async function apiAuth() {
	const { resp } = await runServerRequest("GET", "/api/auth");

	assertResponse(resp, 200, {
		hello: "Welcome to Moneeey AuthAPI",
	});
});
