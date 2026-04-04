import { test } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

/**
 * Wraps `test.step` with optional CLI timing logs. Step durations are always
 * visible in the HTML report and trace viewer; setting `PERF_LOG=1` also
 * prints `[step] name: Xms` lines to stdout so timings show up inline with
 * `--reporter=list` runs.
 */
export async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
	return test.step(name, async () => {
		const start = Date.now();
		try {
			return await fn();
		} finally {
			const ms = Date.now() - start;
			if (process.env.PERF_LOG) {
				console.log(`  [step] ${name}: ${ms}ms`);
			}
		}
	});
}

/**
 * Named timeouts for assertions. Prefer these over hard-coded millisecond
 * literals so that tuning wait budgets is a single-line change.
 *
 * - `interact`: UI click/fill/blur settle (fast DOM ops)
 * - `query`:    DOM presence / text content queries
 * - `compute`:  Reactive recalculation (budget used/remaining, running balances)
 */
export const TIMEOUTS = {
	interact: 5_000,
	query: 10_000,
	compute: 15_000,
} as const;
