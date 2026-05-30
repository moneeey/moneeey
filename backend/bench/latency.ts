import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";
import { sleep } from "./http.ts";
import { summarize } from "./metrics.ts";
import { loadUsers } from "./users.ts";

interface ILatencyConfig {
	wsUrl: string;
	token: string;
	count: number;
	warmup: number;
}

function pingLatency(cfg: ILatencyConfig): Promise<number[]> {
	return new Promise((resolve, reject) => {
		const samples: number[] = [];
		const ws = new WebSocket(cfg.wsUrl);
		let sentAt = 0;
		let done = 0;

		const sendPing = () => {
			sentAt = performance.now();
			ws.send(JSON.stringify({ type: "ping" }));
		};

		ws.onopen = () =>
			ws.send(JSON.stringify({ type: "hello", token: cfg.token }));
		ws.onerror = () => reject(new Error("ws error"));
		ws.onclose = () => {
			if (samples.length < cfg.count) reject(new Error("ws closed early"));
		};
		ws.onmessage = (ev) => {
			const msg = JSON.parse(String(ev.data)) as { type?: string };
			if (msg.type === "ready") {
				sendPing();
				return;
			}
			if (msg.type === "pong") {
				const rtt = performance.now() - sentAt;
				done++;
				if (done > cfg.warmup) samples.push(rtt);
				if (done >= cfg.count + cfg.warmup) {
					ws.close();
					resolve(samples);
				} else {
					sendPing();
				}
			}
		};
	});
}

function report(label: string, samples: number[]): void {
	const s = summarize(samples, 0);
	const mean = samples.reduce((a, b) => a + b, 0) / (samples.length || 1);
	console.log(
		`${label.padEnd(28)} n=${String(samples.length).padStart(5)}  ` +
			`min=${Math.min(...samples).toFixed(2)}ms  mean=${mean.toFixed(2)}ms  ` +
			`p50=${s.p50.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms  p99=${s.p99.toFixed(2)}ms  max=${s.max.toFixed(2)}ms`,
	);
}

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["file", "targets"],
		default: {
			file: "bench/compare-sqlite.users.json",
			targets: "http://localhost:4280,http://localhost:4269",
			count: 2000,
			warmup: 200,
		},
	});
	const users = await loadUsers(String(flags.file));
	if (users.length === 0) {
		console.error(`no users in ${flags.file}; seed first`);
		Deno.exit(1);
	}
	const token = users[0].sessionToken;
	for (const target of String(flags.targets).split(",")) {
		const base = target.trim().replace(/\/$/, "");
		const wsUrl = `${base.replace(/^http/, "ws")}/api/vault`;
		try {
			const samples = await pingLatency({
				wsUrl,
				token,
				count: Number(flags.count),
				warmup: Number(flags.warmup),
			});
			report(`ping ${base}`, samples);
		} catch (err) {
			console.error(`ping ${base} failed: ${(err as Error).message}`);
		}
		await sleep(200);
	}
}
