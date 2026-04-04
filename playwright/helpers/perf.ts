import { test } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

/** `test.step` with optional `PERF_LOG=1` stdout timing. */
export async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
	return test.step(name, async () => {
		const start = Date.now();
		try {
			return await fn();
		} finally {
			if (process.env.PERF_LOG) {
				console.log(`  [step] ${name}: ${Date.now() - start}ms`);
			}
		}
	});
}

export const TIMEOUTS = {
	interact: 5_000,
	query: 10_000,
	compute: 15_000,
} as const;
