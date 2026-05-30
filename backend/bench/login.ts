import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";
import { postJson, runPool } from "./http.ts";
import { summarize } from "./metrics.ts";
import { type ISeededUser, createSaver, loadUsers } from "./users.ts";
import { type IAuthenticationOptions, makeAssertion } from "./webauthn.ts";

interface IOptionsResponse {
	options: IAuthenticationOptions & { rpId?: string };
	flowToken: string;
}

interface IVerifyResponse {
	vaultId: string;
	sessionToken: string;
}

interface ILoginConfig {
	target: string;
	origin: string;
	rpId: string;
	out: string;
	concurrency: number;
	delayMs: number;
}

async function loginOne(cfg: ILoginConfig, user: ISeededUser): Promise<void> {
	const { options, flowToken } = await postJson<IOptionsResponse>(
		`${cfg.target}/api/auth/passkey/login/options`,
		{},
	);
	const signCount = user.counter + 1;
	const assertion = await makeAssertion(
		{ challenge: options.challenge, rpId: options.rpId ?? cfg.rpId },
		{
			credentialId: user.credentialId,
			userHandle: user.userHandle,
			privateKeyJwk: user.privateKeyJwk,
			counter: user.counter,
		},
		cfg.origin,
		signCount,
	);
	const { vaultId, sessionToken } = await postJson<IVerifyResponse>(
		`${cfg.target}/api/auth/passkey/login/verify`,
		{ credential: assertion, flowToken },
	);
	user.counter = signCount;
	user.vaultId = vaultId;
	user.sessionToken = sessionToken;
}

export async function login(cfg: ILoginConfig): Promise<void> {
	const users = await loadUsers(cfg.out);
	if (users.length === 0) {
		console.log(`no users in ${cfg.out}, run seed first`);
		return;
	}
	const save = createSaver(cfg.out);
	console.log(
		`logging in ${users.length} users against ${cfg.target} (concurrency ${cfg.concurrency})`,
	);
	const latencies: number[] = [];
	let errors = 0;
	let done = 0;
	await runPool(
		users.length,
		cfg.concurrency,
		async (i) => {
			const t0 = performance.now();
			try {
				await loginOne(cfg, users[i]);
				latencies.push(performance.now() - t0);
				await save(users);
			} catch (err) {
				errors++;
				console.error(`login ${i} failed: ${(err as Error).message}`);
			}
			done++;
			if (done % 25 === 0 || done === users.length) {
				console.log(`progress ${done}/${users.length}`);
			}
		},
		cfg.delayMs,
	);
	const final = summarize(latencies, errors);
	console.log("\n=== login benchmark ===");
	console.log(`logged in: ${latencies.length}  errors: ${errors}`);
	console.log(
		`latency ms  p50=${final.p50.toFixed(0)}  p95=${final.p95.toFixed(0)}  p99=${final.p99.toFixed(0)}  max=${final.max.toFixed(0)}`,
	);
	console.log(`refreshed session tokens written to ${cfg.out}`);
}

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["target", "origin", "rp-id", "out"],
		default: {
			target: "http://localhost:4280",
			out: "bench/loadtest.users.json",
			concurrency: 1,
			"delay-ms": 0,
		},
	});
	const target = String(flags.target).replace(/\/$/, "");
	const origin = flags.origin ? String(flags.origin) : target;
	const rpId = flags["rp-id"]
		? String(flags["rp-id"])
		: new URL(target).hostname;
	await login({
		target,
		origin,
		rpId,
		out: String(flags.out),
		concurrency: Number(flags.concurrency),
		delayMs: Number(flags["delay-ms"]),
	});
}
