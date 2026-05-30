import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";
import { runPool } from "./http.ts";
import { type ISeededUser, loadUsers } from "./users.ts";

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function randomBlob(bytes: number): string {
	const buf = crypto.getRandomValues(new Uint8Array(bytes));
	let out = "";
	for (const b of buf) out += ALPHABET[b & 63];
	return out;
}

const MAX_BATCH = 100;

function populateVault(
	wsUrl: string,
	user: ISeededUser,
	docs: number,
	docBytes: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(wsUrl);
		let sent = 0;
		let acked = 0;

		const sendBatch = () => {
			const n = Math.min(MAX_BATCH, docs - sent);
			if (n <= 0) return;
			const now = new Date().toISOString();
			const batch = Array.from({ length: n }, (_, i) => ({
				id: `seed-${sent + i}-${randomBlob(8).replace(/[+/]/g, "x")}`,
				updated_at: now,
				deleted_at: null,
				data: randomBlob(docBytes),
			}));
			sent += n;
			ws.send(
				JSON.stringify({ type: "push", request_id: `b${sent}`, docs: batch }),
			);
		};

		ws.onopen = () =>
			ws.send(JSON.stringify({ type: "hello", token: user.sessionToken }));
		ws.onerror = () => reject(new Error("ws error"));
		ws.onclose = () => {
			if (acked < docs) reject(new Error(`closed early (${acked}/${docs})`));
		};
		ws.onmessage = (ev) => {
			const msg = JSON.parse(String(ev.data)) as {
				type?: string;
				results?: { status: string }[];
			};
			if (msg.type === "ready") {
				sendBatch();
				return;
			}
			if (msg.type === "push_result") {
				acked += msg.results?.length ?? 0;
				if (acked >= docs) {
					ws.close();
					resolve();
				} else {
					sendBatch();
				}
			}
		};
	});
}

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["target", "file"],
		default: {
			target: "http://localhost:4280",
			file: "bench/loadtest.users.json",
			"docs-per-vault": 5000,
			"doc-bytes": 512,
			concurrency: 16,
			vaults: 0,
		},
	});
	const target = String(flags.target).replace(/\/$/, "");
	const wsUrl = `${target.replace(/^http/, "ws")}/api/vault`;
	const all = await loadUsers(String(flags.file));
	const limit = Number(flags.vaults);
	const users = limit > 0 ? all.slice(0, limit) : all;
	const docs = Number(flags["docs-per-vault"]);
	const docBytes = Number(flags["doc-bytes"]);
	console.log(
		`populating ${users.length} vaults x ${docs} docs (${docBytes}B) via ${target}`,
	);
	let done = 0;
	const start = performance.now();
	await runPool(users.length, Number(flags.concurrency), async (i) => {
		try {
			await populateVault(wsUrl, users[i], docs, docBytes);
		} catch (err) {
			console.error(`vault ${i} failed: ${(err as Error).message}`);
		}
		done++;
		if (done % 25 === 0 || done === users.length) {
			console.log(`progress ${done}/${users.length}`);
		}
	});
	const secs = (performance.now() - start) / 1000;
	const total = users.length * docs;
	console.log(
		`done: ${total} docs in ${secs.toFixed(1)}s (${Math.round(total / secs)} docs/s)`,
	);
}
