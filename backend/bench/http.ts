export async function postJson<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`${res.status} ${url} ${text.slice(0, 200)}`);
	}
	return (text ? JSON.parse(text) : {}) as T;
}

export const sleep = (ms: number): Promise<void> =>
	new Promise((r) => setTimeout(r, ms));

export async function runPool(
	count: number,
	concurrency: number,
	task: (index: number) => Promise<void>,
	delayMs = 0,
): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (true) {
			const i = next++;
			if (i >= count) return;
			if (delayMs > 0 && i > 0) await sleep(delayMs);
			await task(i);
		}
	};
	const workers = Array.from(
		{ length: Math.max(1, Math.min(concurrency, count)) },
		worker,
	);
	await Promise.all(workers);
}
