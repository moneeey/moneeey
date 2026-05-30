import { parse } from "https://deno.land/std@0.195.0/flags/mod.ts";

interface IHistogram {
	buckets: { le: number; count: number }[];
	sum: number;
	count: number;
}

function parsePrometheus(text: string): Map<string, IHistogram> {
	const hists = new Map<string, IHistogram>();
	const get = (key: string): IHistogram => {
		let h = hists.get(key);
		if (!h) {
			h = { buckets: [], sum: 0, count: 0 };
			hists.set(key, h);
		}
		return h;
	};
	for (const line of text.split("\n")) {
		if (line.startsWith("#") || line.trim().length === 0) continue;
		const m = line.match(/^(\w+?)(_bucket|_sum|_count)(\{[^}]*\})?\s+(\S+)$/);
		if (!m) continue;
		const [, name, kind, rawLabels, rawValue] = m;
		const value = Number(rawValue);
		const labels: Record<string, string> = {};
		let le: string | undefined;
		if (rawLabels) {
			for (const part of rawLabels.slice(1, -1).split(",")) {
				const eq = part.indexOf("=");
				const lname = part.slice(0, eq);
				const lval = part.slice(eq + 1).replace(/"/g, "");
				if (lname === "le") le = lval;
				else labels[lname] = lval;
			}
		}
		const groupKey = `${name}${JSON.stringify(labels)}`;
		const h = get(groupKey);
		if (kind === "_bucket") {
			h.buckets.push({
				le: le === "+Inf" ? Number.POSITIVE_INFINITY : Number(le),
				count: value,
			});
		} else if (kind === "_sum") {
			h.sum = value;
		} else if (kind === "_count") {
			h.count = value;
		}
	}
	return hists;
}

function quantile(h: IHistogram, q: number): number {
	if (h.count === 0) return 0;
	const buckets = [...h.buckets].sort((a, b) => a.le - b.le);
	const target = q * h.count;
	let prevCount = 0;
	let prevLe = 0;
	for (const b of buckets) {
		if (b.count >= target) {
			if (b.le === Number.POSITIVE_INFINITY) return prevLe;
			const frac = (target - prevCount) / (b.count - prevCount || 1);
			return prevLe + (b.le - prevLe) * frac;
		}
		prevCount = b.count;
		prevLe = b.le;
	}
	return prevLe;
}

const ms = (s: number): string => `${(s * 1000).toFixed(3)}ms`;

if (import.meta.main) {
	const flags = parse(Deno.args, {
		string: ["target"],
		default: { target: "http://localhost:4280" },
	});
	const text = await (
		await fetch(`${String(flags.target).replace(/\/$/, "")}/api/metrics`)
	).text();
	const hists = parsePrometheus(text);
	const rows: {
		name: string;
		mean: number;
		p50: number;
		p95: number;
		p99: number;
		n: number;
	}[] = [];
	for (const [key, h] of hists) {
		if (h.count === 0) continue;
		rows.push({
			name: key,
			mean: h.sum / h.count,
			p50: quantile(h, 0.5),
			p95: quantile(h, 0.95),
			p99: quantile(h, 0.99),
			n: h.count,
		});
	}
	rows.sort((a, b) => a.name.localeCompare(b.name));
	console.log("server-side latency (from /api/metrics):");
	for (const r of rows) {
		console.log(
			`${r.name.padEnd(60)} n=${String(r.n).padStart(8)}  mean=${ms(r.mean).padStart(10)}  p50=${ms(r.p50).padStart(10)}  p95=${ms(r.p95).padStart(10)}  p99=${ms(r.p99).padStart(10)}`,
		);
	}
}
