#!/usr/bin/env bash
set -euo pipefail

# Consistent storage-engine benchmark: for each engine, wipe data, restart the
# stack on that engine, seed users via the real passkey flow, run an identical
# capacity ramp, and snapshot /api/metrics. Results land in bench/results/.
#
# Tunables (env): ENGINES, COUNT, TARGET, CONCURRENCY, RAMP_ARGS.

cd "$(dirname "$0")/.."          # backend/
REPO=".."                        # repo root (has docker-compose.yaml)

ENGINES="${ENGINES:-sqlite-per-vault sqlite-single postgres}"
COUNT="${COUNT:-500}"
TARGET="${TARGET:-http://localhost:4280}"
CONCURRENCY="${CONCURRENCY:-8}"
RAMP_ARGS="${RAMP_ARGS:---start 100 --step 100 --step-seconds 10 --warmup-seconds 3 --push-interval-ms 4000 --push-docs 2 --doc-bytes 512 --slo-p95-ms 500 --slo-error-rate 0.02}"
# Pre-fill each of the first POPULATE_VAULTS vaults with POPULATE_DOCS docs (0 = skip).
POPULATE_DOCS="${POPULATE_DOCS:-0}"
POPULATE_VAULTS="${POPULATE_VAULTS:-100}"

RESULTS="bench/results"
mkdir -p "$RESULTS"

# Ensure the postgres image is present (a missing image is silently skipped by up).
podman pull docker.io/library/postgres:16-alpine >/dev/null 2>&1 || true

set_engine() { sed -i "s/^MONEEEY_DB_ENGINE=.*/MONEEEY_DB_ENGINE=$1/" env.example; }

wipe_data() {
	podman unshare rm -rf "$REPO/docker/volume/backend_data" "$REPO/docker/volume/postgres_data" 2>/dev/null || true
	mkdir -p "$REPO/docker/volume/backend_data"
}

wait_health() {
	for _ in $(seq 1 60); do
		code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TARGET/api/auth/passkey/login/options" -H 'content-type: application/json' -d '{}' || true)
		[ "$code" = "200" ] && return 0
		sleep 3
	done
	echo "backend did not become healthy"; return 1
}

sample_resources() {
	# Append a podman stats snapshot every 2s until killed.
	local out="$1"
	: > "$out"
	while true; do
		ts=$(date +%s 2>/dev/null || echo 0)
		podman stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' 2>/dev/null \
			| grep -E 'backend|postgres' | sed "s/^/${ts} /" >> "$out" || true
		sleep 2
	done
}

for engine in $ENGINES; do
	echo "=================== engine=$engine ==================="
	( cd "$REPO" && podman-compose down ) >/dev/null 2>&1 || true
	wipe_data
	set_engine "$engine"
	( cd "$REPO" && podman-compose up -d ) >/dev/null 2>&1
	wait_health
	users="bench/compare-$engine.users.json"
	rm -f "$users"
	echo "--- seeding $COUNT users ---"
	deno run --allow-read --allow-write --allow-net --allow-import bench/seed.ts \
		--target "$TARGET" --count "$COUNT" --out "$users" --concurrency "$CONCURRENCY" \
		2>&1 | tail -4 | tee "$RESULTS/seed-$engine.txt"
	if [ "$POPULATE_DOCS" -gt 0 ]; then
		echo "--- pre-populating $POPULATE_VAULTS vaults x $POPULATE_DOCS docs ---"
		deno run --allow-read --allow-write --allow-net --allow-import bench/populate.ts \
			--target "$TARGET" --file "$users" --vaults "$POPULATE_VAULTS" \
			--docs-per-vault "$POPULATE_DOCS" 2>&1 | tail -3 | tee "$RESULTS/populate-$engine.txt"
	fi
	echo "--- ramp (sampling resources) ---"
	sample_resources "$RESULTS/resources-$engine.txt" &
	sampler=$!
	# shellcheck disable=SC2086
	deno run --allow-read --allow-net --allow-import bench/run.ts \
		--target "$TARGET" --file "$users" $RAMP_ARGS \
		2>&1 | tee "$RESULTS/ramp-$engine.txt"
	kill "$sampler" 2>/dev/null || true
	curl -s "$TARGET/api/metrics" > "$RESULTS/metrics-$engine.txt" || true
	echo "--- server-side latency ---"
	deno run --allow-net --allow-import bench/metrics_report.ts --target "$TARGET" \
		2>&1 | grep -E "db_op|push_duration|manifest|fetch" | tee "$RESULTS/server-$engine.txt"
done

set_engine sqlite-per-vault
echo "=================== done; results in $RESULTS ==================="
