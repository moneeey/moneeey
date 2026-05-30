export type OpKind = "connect" | "sync" | "push" | "fetch";

export interface ISlo {
	p95PushMs: number;
	maxErrorRate: number;
}

export interface IWindowStats {
	samples: number;
	p50: number;
	p95: number;
	p99: number;
	max: number;
	errorRate: number;
}

export interface IStepResult {
	connections: number;
	push: IWindowStats;
	errors: number;
	ok: number;
	breached: boolean;
}

export function percentile(sortedAsc: number[], p: number): number {
	if (sortedAsc.length === 0) return 0;
	if (p <= 0) return sortedAsc[0];
	if (p >= 100) return sortedAsc[sortedAsc.length - 1];
	const rank = (p / 100) * (sortedAsc.length - 1);
	const low = Math.floor(rank);
	const high = Math.ceil(rank);
	if (low === high) return sortedAsc[low];
	const weight = rank - low;
	return sortedAsc[low] * (1 - weight) + sortedAsc[high] * weight;
}

export function summarize(latencies: number[], errors: number): IWindowStats {
	const sorted = [...latencies].sort((a, b) => a - b);
	const ok = sorted.length;
	const total = ok + errors;
	return {
		samples: ok,
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
		max: sorted.length === 0 ? 0 : sorted[sorted.length - 1],
		errorRate: total === 0 ? 0 : errors / total,
	};
}

export function breachesSlo(stats: IWindowStats, slo: ISlo): boolean {
	if (stats.samples === 0) return false;
	return stats.p95 > slo.p95PushMs || stats.errorRate > slo.maxErrorRate;
}

export class Recorder {
	private pushWindow: number[] = [];
	private errorWindow = 0;
	private okTotal = 0;
	private errorTotal = 0;

	recordPush(latencyMs: number): void {
		this.pushWindow.push(latencyMs);
		this.okTotal += 1;
	}

	recordError(): void {
		this.errorWindow += 1;
		this.errorTotal += 1;
	}

	takeWindow(): IWindowStats {
		const stats = summarize(this.pushWindow, this.errorWindow);
		this.pushWindow = [];
		this.errorWindow = 0;
		return stats;
	}

	totals(): { ok: number; errors: number } {
		return { ok: this.okTotal, errors: this.errorTotal };
	}
}
