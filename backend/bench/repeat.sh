#!/usr/bin/env bash
set -euo pipefail

# Repeatability harness: for each engine, restart fresh + seed once, then run the
# SAME fixed-load step REPS times, reporting per-rep client RTT (small payloads so
# it is not Nagle-floored) and per-rep server-side DB push latency (metric deltas).

cd "$(dirname "$0")/.."
REPO=".."

ENGINES="${ENGINES:-sqlite-per-vault sqlite-single postgres}"
COUNT="${COUNT:-400}"
REPS="${REPS:-3}"
TARGET="${TARGET:-http://localhost:4280}"
STEP_ARGS="${STEP_ARGS:---start 300 --step 300 --step-seconds 12 --warmup-seconds 3 --push-interval-ms 250 --push-docs 1 --doc-bytes 256 --slo-p95-ms 2000 --slo-error-rate 0.10}"

RES="bench/results/repeat"
mkdir -p "$RES"
podman pull docker.io/library/postgres:16-alpine >/dev/null 2>&1 || true

set_engine() { sed -i "s/^MONEEEY_DB_ENGINE=.*/MONEEEY_DB_ENGINE=$1/" env.example; }
wipe() {
	podman unshare rm -rf "$REPO/docker/volume/backend_data" "$REPO/docker/volume/postgres_data" 2>/dev/null || true
	mkdir -p "$REPO/docker/volume/backend_data"
}
wait_health() {
	for _ in $(seq 1 60); do
		[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$TARGET/api/auth/passkey/login/options" -H 'content-type: application/json' -d '{}' || true)" = "200" ] && return 0
		sleep 3
	done
	return 1
}
db_sum_count() {
	curl -s "$TARGET/api/metrics" | awk '
		/moneeey_db_op_duration_seconds_sum.*op="push"/ {s=$2}
		/moneeey_db_op_duration_seconds_count.*op="push"/ {c=$2}
		END {print s+0, c+0}'
}

for engine in $ENGINES; do
	( cd "$REPO" && podman-compose down ) >/dev/null 2>&1 || true
	wipe; set_engine "$engine"
	( cd "$REPO" && podman-compose up -d ) >/dev/null 2>&1
	wait_health
	users="bench/repeat-$engine.users.json"; rm -f "$users"
	deno run --allow-read --allow-write --allow-net --allow-import bench/seed.ts \
		--target "$TARGET" --count "$COUNT" --out "$users" --concurrency 8 >/dev/null 2>&1
	echo "########## $engine ##########"
	for rep in $(seq 1 "$REPS"); do
		before=$(db_sum_count)
		# shellcheck disable=SC2086
		line=$(deno run --allow-read --allow-net --allow-import bench/run.ts \
			--target "$TARGET" --file "$users" $STEP_ARGS 2>&1 | grep -E "conns=" | tail -1)
		after=$(db_sum_count)
		dbms=$(awk -v b="$before" -v a="$after" 'BEGIN{
			split(b,B," "); split(a,A," ");
			ds=A[1]-B[1]; dc=A[2]-B[2];
			if (dc>0) printf "%.3f", (ds/dc)*1000; else printf "0";
		}')
		echo "rep$rep  $line  server_db_push_mean=${dbms}ms"
	done | tee "$RES/$engine.txt"
done

set_engine sqlite-per-vault
echo "=== done; per-rep results in $RES ==="
