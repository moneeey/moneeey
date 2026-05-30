type Labels = Record<string, string>;

const labelKey = (labels: Labels): string =>
	Object.keys(labels)
		.sort()
		.map((k) => `${k}=${labels[k]}`)
		.join(",");

const escapeLabelValue = (value: string): string =>
	value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

const renderLabels = (labels: Labels): string => {
	const keys = Object.keys(labels).sort();
	if (keys.length === 0) return "";
	return `{${keys.map((k) => `${k}="${escapeLabelValue(labels[k])}"`).join(",")}}`;
};

const splitKey = (key: string): Labels => {
	const labels: Labels = {};
	if (key.length === 0) return labels;
	for (const pair of key.split(",")) {
		const eq = pair.indexOf("=");
		labels[pair.slice(0, eq)] = pair.slice(eq + 1);
	}
	return labels;
};

class Counter {
	private values = new Map<string, number>();
	constructor(
		readonly name: string,
		readonly help: string,
	) {}

	inc(labels: Labels = {}, by = 1): void {
		const k = labelKey(labels);
		this.values.set(k, (this.values.get(k) ?? 0) + by);
	}

	render(): string {
		const lines = [
			`# HELP ${this.name} ${this.help}`,
			`# TYPE ${this.name} counter`,
		];
		for (const [k, v] of this.values) {
			lines.push(`${this.name}${renderLabels(splitKey(k))} ${v}`);
		}
		return lines.join("\n");
	}
}

class Gauge {
	private values = new Map<string, number>();
	constructor(
		readonly name: string,
		readonly help: string,
	) {}

	inc(labels: Labels = {}, by = 1): void {
		const k = labelKey(labels);
		this.values.set(k, (this.values.get(k) ?? 0) + by);
	}

	dec(labels: Labels = {}, by = 1): void {
		this.inc(labels, -by);
	}

	set(value: number, labels: Labels = {}): void {
		this.values.set(labelKey(labels), value);
	}

	render(): string {
		const lines = [
			`# HELP ${this.name} ${this.help}`,
			`# TYPE ${this.name} gauge`,
		];
		for (const [k, v] of this.values) {
			lines.push(`${this.name}${renderLabels(splitKey(k))} ${v}`);
		}
		return lines.join("\n");
	}
}

const DEFAULT_BUCKETS = [
	0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
];

// Sub-millisecond resolution for in-process DB ops (50us .. 100ms).
const FINE_BUCKETS = [
	0.00005, 0.0001, 0.00025, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05,
	0.1,
];

class Histogram {
	private buckets: Map<string, number[]> = new Map();
	private sums = new Map<string, number>();
	private counts = new Map<string, number>();
	constructor(
		readonly name: string,
		readonly help: string,
		readonly bounds: number[] = DEFAULT_BUCKETS,
	) {}

	observe(seconds: number, labels: Labels = {}): void {
		const k = labelKey(labels);
		let counts = this.buckets.get(k);
		if (!counts) {
			counts = new Array(this.bounds.length).fill(0);
			this.buckets.set(k, counts);
		}
		for (let i = 0; i < this.bounds.length; i++) {
			if (seconds <= this.bounds[i]) counts[i] += 1;
		}
		this.sums.set(k, (this.sums.get(k) ?? 0) + seconds);
		this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
	}

	render(): string {
		const lines = [
			`# HELP ${this.name} ${this.help}`,
			`# TYPE ${this.name} histogram`,
		];
		for (const [k, counts] of this.buckets) {
			const labels = splitKey(k);
			for (let i = 0; i < this.bounds.length; i++) {
				lines.push(
					`${this.name}_bucket${renderLabels({ ...labels, le: String(this.bounds[i]) })} ${counts[i]}`,
				);
			}
			const total = this.counts.get(k) ?? 0;
			lines.push(
				`${this.name}_bucket${renderLabels({ ...labels, le: "+Inf" })} ${total}`,
			);
			lines.push(
				`${this.name}_sum${renderLabels(labels)} ${this.sums.get(k) ?? 0}`,
			);
			lines.push(`${this.name}_count${renderLabels(labels)} ${total}`);
		}
		return lines.join("\n");
	}
}

export const metrics = {
	wsConnections: new Gauge(
		"moneeey_ws_connections",
		"Active vault websocket connections",
	),
	wsMessages: new Counter(
		"moneeey_ws_messages_total",
		"Inbound websocket messages by type",
	),
	syncPushDocs: new Counter(
		"moneeey_sync_push_docs_total",
		"Documents accepted via push",
	),
	pushDuration: new Histogram(
		"moneeey_sync_push_duration_seconds",
		"push handler duration",
	),
	fetchDuration: new Histogram(
		"moneeey_sync_fetch_duration_seconds",
		"fetch handler duration",
	),
	manifestDuration: new Histogram(
		"moneeey_sync_manifest_duration_seconds",
		"manifest handler duration",
	),
	dbDuration: new Histogram(
		"moneeey_db_op_duration_seconds",
		"data-layer DB operation duration by op",
		FINE_BUCKETS,
	),
	errors: new Counter("moneeey_errors_total", "Errors by area"),
};

const registry = [
	metrics.wsConnections,
	metrics.wsMessages,
	metrics.syncPushDocs,
	metrics.pushDuration,
	metrics.fetchDuration,
	metrics.manifestDuration,
	metrics.dbDuration,
	metrics.errors,
];

export function renderMetrics(): string {
	return `${registry.map((m) => m.render()).join("\n\n")}\n`;
}
