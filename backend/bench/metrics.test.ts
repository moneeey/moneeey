import { assertEquals } from "https://deno.land/std@0.195.0/assert/mod.ts";
import { Recorder, breachesSlo, percentile, summarize } from "./metrics.ts";

Deno.test("percentile handles empty and edges", () => {
	assertEquals(percentile([], 50), 0);
	assertEquals(percentile([5], 50), 5);
	assertEquals(percentile([1, 2, 3, 4], 0), 1);
	assertEquals(percentile([1, 2, 3, 4], 100), 4);
});

Deno.test("percentile interpolates", () => {
	assertEquals(percentile([0, 100], 50), 50);
	assertEquals(percentile([0, 10, 20, 30, 40], 50), 20);
});

Deno.test("summarize reports error rate", () => {
	const stats = summarize([10, 20, 30], 1);
	assertEquals(stats.samples, 3);
	assertEquals(stats.p50, 20);
	assertEquals(stats.max, 30);
	assertEquals(stats.errorRate, 0.25);
});

Deno.test("breachesSlo on latency and error rate", () => {
	const slo = { p95PushMs: 500, maxErrorRate: 0.01 };
	assertEquals(breachesSlo(summarize([100, 200], 0), slo), false);
	assertEquals(breachesSlo(summarize([100, 900], 0), slo), true);
	assertEquals(breachesSlo(summarize([100, 100], 5), slo), true);
	assertEquals(breachesSlo(summarize([], 100), slo), false);
});

Deno.test("Recorder windows reset between takes", () => {
	const rec = new Recorder();
	rec.recordPush(10);
	rec.recordPush(20);
	rec.recordError();
	const first = rec.takeWindow();
	assertEquals(first.samples, 2);
	assertEquals(first.errorRate, 1 / 3);
	const second = rec.takeWindow();
	assertEquals(second.samples, 0);
	assertEquals(rec.totals(), { ok: 2, errors: 1 });
});
