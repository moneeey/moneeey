import { metrics, renderMetrics } from "./metrics.ts";
import { assert } from "./test.ts";

Deno.test(function countersGaugesHistogramsRender() {
	metrics.wsMessages.inc({ type: "push" });
	metrics.wsMessages.inc({ type: "push" });
	metrics.wsConnections.set(7);
	metrics.dbDuration.observe(0.003, { op: "push" });

	const out = renderMetrics();
	const has = (needle: string) =>
		assert.assertEquals(out.includes(needle), true);

	has("# TYPE moneeey_ws_messages_total counter");
	has('moneeey_ws_messages_total{type="push"} 2');
	has("# TYPE moneeey_ws_connections gauge");
	has("moneeey_ws_connections 7");
	has("# TYPE moneeey_db_op_duration_seconds histogram");
	has('moneeey_db_op_duration_seconds_count{op="push"} 1');
	has('moneeey_db_op_duration_seconds_bucket{le="+Inf",op="push"} 1');
});

Deno.test(function labelValuesAreEscaped() {
	metrics.wsMessages.inc({ type: 'a"b\\c' });
	const out = renderMetrics();
	assert.assertEquals(out.includes('type="a\\"b\\\\c"'), true);
});
