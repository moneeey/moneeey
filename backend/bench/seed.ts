import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";
import { postJson, runPool } from "./http.ts";
import { summarize } from "./metrics.ts";
import { type ISeededUser, createSaver, loadUsers } from "./users.ts";
import { type IRegistrationOptions, makeRegistration } from "./webauthn.ts";

export const LOADTEST_PREFIX = "loadtest-";

interface IOptionsResponse {
	options: IRegistrationOptions;
	flowToken: string;
}

interface IVerifyResponse {
	vaultId: string;
	sessionToken: string;
}

interface ISeedConfig {
	target: string;
	origin: string;
	count: number;
	out: string;
	prefix: string;
	concurrency: number;
	delayMs: number;
}

async function registerOne(
	cfg: ISeedConfig,
	index: number,
): Promise<ISeededUser> {
	const displayName = `${cfg.prefix}${String(index).padStart(5, "0")}`;
	const { options, flowToken } = await postJson<IOptionsResponse>(
		`${cfg.target}/api/auth/passkey/register/options`,
		{ displayName },
	);
	const { credentialJSON, credential } = await makeRegistration(
		{
			challenge: options.challenge,
			rp: { id: options.rp.id, name: options.rp.name },
			user: {
				id: options.user.id,
				name: options.user.name,
				displayName: options.user.displayName,
			},
		},
		cfg.origin,
	);
	const { vaultId, sessionToken } = await postJson<IVerifyResponse>(
		`${cfg.target}/api/auth/passkey/register/verify`,
		{ credential: credentialJSON, flowToken },
	);
	return {
		displayName,
		credentialId: credential.credentialId,
		userHandle: credential.userHandle,
		privateKeyJwk: credential.privateKeyJwk,
		vaultId,
		sessionToken,
		counter: 0,
	};
}

export async function seed(cfg: ISeedConfig): Promise<void> {
	const users = await loadUsers(cfg.out);
	const save = createSaver(cfg.out);
	const startIndex = users.length;
	const toCreate = Math.max(0, cfg.count - startIndex);
	if (toCreate === 0) {
		console.log(
			`already have ${users.length} users in ${cfg.out}, nothing to do`,
		);
		return;
	}
	console.log(
		`registering ${toCreate} users against ${cfg.target} (concurrency ${cfg.concurrency})`,
	);
	const latencies: number[] = [];
	let errors = 0;
	let done = 0;
	await runPool(
		toCreate,
		cfg.concurrency,
		async (offset) => {
			const index = startIndex + offset;
			const t0 = performance.now();
			try {
				const user = await registerOne(cfg, index);
				latencies.push(performance.now() - t0);
				users.push(user);
				await save(users);
			} catch (err) {
				errors++;
				console.error(`register ${index} failed: ${(err as Error).message}`);
			}
			done++;
			if (done % 25 === 0 || done === toCreate) {
				console.log(`progress ${done}/${toCreate}`);
			}
		},
		cfg.delayMs,
	);
	const final = summarize(latencies, errors);
	console.log("\n=== registration benchmark ===");
	console.log(`registered: ${latencies.length}  errors: ${errors}`);
	console.log(
		`latency ms  p50=${final.p50.toFixed(0)}  p95=${final.p95.toFixed(0)}  p99=${final.p99.toFixed(0)}  max=${final.max.toFixed(0)}`,
	);
	console.log(`total users in ${cfg.out}: ${users.length}`);
}

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["target", "origin", "out", "prefix"],
		default: {
			target: "http://localhost:4280",
			count: 200,
			out: "bench/loadtest.users.json",
			prefix: LOADTEST_PREFIX,
			concurrency: 1,
			"delay-ms": 0,
		},
	});
	const target = String(flags.target).replace(/\/$/, "");
	const origin = flags.origin ? String(flags.origin) : target;
	await seed({
		target,
		origin,
		count: Number(flags.count),
		out: String(flags.out),
		prefix: String(flags.prefix),
		concurrency: Number(flags.concurrency),
		delayMs: Number(flags["delay-ms"]),
	});
}
