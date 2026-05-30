import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";
import { sleep } from "./http.ts";
import {
	type ISlo,
	type IWindowStats,
	Recorder,
	breachesSlo,
} from "./metrics.ts";
import { type ISeededUser, loadUsers } from "./users.ts";

interface IRunConfig {
	wsUrl: string;
	users: ISeededUser[];
	slo: ISlo;
	start: number;
	step: number;
	stepMs: number;
	warmupMs: number;
	pushIntervalMs: number;
	pushDocs: number;
	docBytes: number;
}

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function randomBlob(bytes: number): string {
	const buf = crypto.getRandomValues(new Uint8Array(bytes));
	let out = "";
	for (const b of buf) out += ALPHABET[b & 63];
	return out;
}

function randomId(): string {
	return randomBlob(16).replace(/[+/]/g, "x");
}

class LoadClient {
	private ws: WebSocket;
	private pending = new Map<string, number>();
	private timer: number | null = null;
	private closed = false;
	synced = false;

	constructor(
		user: ISeededUser,
		private readonly cfg: IRunConfig,
		private readonly rec: Recorder,
	) {
		this.ws = new WebSocket(cfg.wsUrl);
		this.ws.onopen = () =>
			this.send({ type: "hello", token: user.sessionToken });
		this.ws.onmessage = (ev) => this.onMessage(String(ev.data));
		this.ws.onerror = () => {
			if (!this.closed) this.rec.recordError();
		};
		this.ws.onclose = () => {
			if (!this.closed) {
				this.closed = true;
				this.rec.recordError();
			}
		};
	}

	private send(obj: unknown): void {
		try {
			this.ws.send(JSON.stringify(obj));
		} catch {
			this.rec.recordError();
		}
	}

	private onMessage(raw: string): void {
		let msg: { type?: string; request_id?: string; pull_ids?: string[] };
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		switch (msg.type) {
			case "ready":
				this.send({ type: "manifest", request_id: "init", entries: [] });
				break;
			case "reconcile_result": {
				const ids = msg.pull_ids ?? [];
				for (let i = 0; i < ids.length; i += 100) {
					this.send({
						type: "fetch",
						request_id: `fetch-${i}`,
						ids: ids.slice(i, i + 100),
					});
				}
				this.synced = true;
				this.schedulePush();
				break;
			}
			case "push_result": {
				const started = this.pending.get(msg.request_id ?? "");
				if (started !== undefined) {
					this.pending.delete(msg.request_id ?? "");
					this.rec.recordPush(performance.now() - started);
				}
				break;
			}
			case "error":
				this.rec.recordError();
				break;
		}
	}

	private schedulePush(): void {
		if (this.closed) return;
		const jitter = this.cfg.pushIntervalMs * (0.5 + Math.random());
		this.timer = setTimeout(() => this.pushBatch(), jitter);
	}

	private pushBatch(): void {
		if (this.closed || this.ws.readyState !== WebSocket.OPEN) return;
		const now = new Date().toISOString();
		const docs = Array.from({ length: this.cfg.pushDocs }, () => ({
			id: randomId(),
			updated_at: now,
			deleted_at: null,
			data: randomBlob(this.cfg.docBytes),
		}));
		const requestId = randomId();
		this.pending.set(requestId, performance.now());
		this.send({ type: "push", request_id: requestId, docs });
		this.schedulePush();
	}

	close(): void {
		this.closed = true;
		if (this.timer !== null) clearTimeout(this.timer);
		try {
			this.ws.close();
		} catch {
			/* ignore */
		}
	}
}

function formatRow(conns: number, stats: IWindowStats): string {
	return [
		`conns=${String(conns).padStart(5)}`,
		`push=${String(stats.samples).padStart(6)}`,
		`p50=${stats.p50.toFixed(0).padStart(5)}ms`,
		`p95=${stats.p95.toFixed(0).padStart(6)}ms`,
		`p99=${stats.p99.toFixed(0).padStart(6)}ms`,
		`max=${stats.max.toFixed(0).padStart(6)}ms`,
		`err=${(stats.errorRate * 100).toFixed(1).padStart(5)}%`,
	].join("  ");
}

export async function run(cfg: IRunConfig): Promise<void> {
	const rec = new Recorder();
	const clients: LoadClient[] = [];
	let ceiling = 0;
	let breached = false;

	const cleanup = () => {
		for (const c of clients) c.close();
	};
	Deno.addSignalListener("SIGINT", () => {
		console.log("\ninterrupted, closing connections");
		cleanup();
		Deno.exit(0);
	});

	console.log(
		`ramp: start=${cfg.start} step=${cfg.step} stepMs=${cfg.stepMs} max=${cfg.users.length}`,
	);
	console.log(
		`slo: p95<=${cfg.slo.p95PushMs}ms errorRate<=${(cfg.slo.maxErrorRate * 100).toFixed(1)}%\n`,
	);

	for (let conns = cfg.start; conns <= cfg.users.length; conns += cfg.step) {
		while (clients.length < conns && clients.length < cfg.users.length) {
			clients.push(new LoadClient(cfg.users[clients.length], cfg, rec));
		}
		await sleep(cfg.warmupMs);
		rec.takeWindow();
		await sleep(cfg.stepMs);
		const stats = rec.takeWindow();
		console.log(formatRow(clients.length, stats));
		if (breachesSlo(stats, cfg.slo)) {
			breached = true;
			console.log(`\nSLO breached at ${clients.length} connections`);
			break;
		}
		ceiling = clients.length;
	}

	cleanup();
	const totals = rec.totals();
	console.log("\n=== capacity report ===");
	console.log(
		breached
			? `sustained ceiling: ~${ceiling} concurrent connections (SLO held)`
			: `held SLO through all ${ceiling} connections (ran out of seeded users — seed more to push higher)`,
	);
	console.log(`total pushes ok: ${totals.ok}  errors: ${totals.errors}`);
}

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["target", "file"],
		default: {
			target: "http://localhost:4280",
			file: "bench/loadtest.users.json",
			start: 25,
			step: 25,
			"step-seconds": 15,
			"warmup-seconds": 3,
			"push-interval-ms": 4000,
			"push-docs": 2,
			"doc-bytes": 512,
			"slo-p95-ms": 500,
			"slo-error-rate": 0.02,
		},
	});
	const target = String(flags.target).replace(/\/$/, "");
	const wsUrl = `${target.replace(/^http/, "ws")}/api/vault`;
	const users = await loadUsers(String(flags.file));
	if (users.length === 0) {
		console.error(`no users in ${flags.file}, run bench:seed first`);
		Deno.exit(1);
	}
	await run({
		wsUrl,
		users,
		slo: {
			p95PushMs: Number(flags["slo-p95-ms"]),
			maxErrorRate: Number(flags["slo-error-rate"]),
		},
		start: Number(flags.start),
		step: Number(flags.step),
		stepMs: Number(flags["step-seconds"]) * 1000,
		warmupMs: Number(flags["warmup-seconds"]) * 1000,
		pushIntervalMs: Number(flags["push-interval-ms"]),
		pushDocs: Number(flags["push-docs"]),
		docBytes: Number(flags["doc-bytes"]),
	});
}
