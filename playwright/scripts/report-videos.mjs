import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightDir = path.resolve(scriptDir, "..");
const resultsDir = path.join(playwrightDir, "test-results");
const outputPath = path.join(playwrightDir, "report-videos.html");

async function walk(dir) {
	let entries = [];
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch (err) {
		if (err?.code === "ENOENT") return [];
		throw err;
	}

	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) return walk(fullPath);
			return entry.isFile() && entry.name.endsWith(".webm") ? [fullPath] : [];
		}),
	);

	return files.flat();
}

const videos = (
	await Promise.all(
		(
			await walk(resultsDir)
		).map(async (filePath) => {
			const relativePath = path.relative(playwrightDir, filePath);
			const resultName = path
				.dirname(relativePath)
				.replace(/^test-results\//, "");
			const info = await stat(filePath);
			return {
				title: resultName,
				src: relativePath.split(path.sep).join("/"),
				size: info.size,
			};
		}),
	)
).sort((a, b) => a.title.localeCompare(b.title) || a.src.localeCompare(b.src));

const videoItems = JSON.stringify(videos, null, 2).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Playwright Video Review</title>
	<style>
		:root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
		body { margin: 0; background: #111827; color: #f9fafb; }
		main { display: grid; grid-template-columns: minmax(0, 1fr) 24rem; gap: 1rem; min-height: 100vh; padding: 1rem; box-sizing: border-box; }
		section, aside { background: #1f2937; border: 1px solid #374151; border-radius: 0.75rem; }
		section { display: flex; flex-direction: column; min-width: 0; }
		header { padding: 1rem; border-bottom: 1px solid #374151; }
		h1 { margin: 0; font-size: 1.25rem; }
		p { margin: 0.5rem 0 0; color: #d1d5db; }
		video { width: 100%; max-height: calc(100vh - 13rem); background: #030712; }
		.controls { display: flex; gap: 0.5rem; align-items: center; padding: 1rem; border-top: 1px solid #374151; }
		button { border: 0; border-radius: 0.5rem; padding: 0.55rem 0.8rem; background: #60a5fa; color: #0f172a; font-weight: 700; cursor: pointer; }
		button:disabled { cursor: not-allowed; opacity: 0.45; }
		#index { margin-left: auto; color: #d1d5db; font-variant-numeric: tabular-nums; }
		aside { overflow: auto; max-height: calc(100vh - 2rem); }
		ol { list-style: none; margin: 0; padding: 0.5rem; }
		li { margin: 0; }
		.playlist-item { width: 100%; text-align: left; display: block; background: transparent; color: #e5e7eb; border-radius: 0.5rem; padding: 0.65rem; font-weight: 500; }
		.playlist-item:hover, .playlist-item[aria-current="true"] { background: #374151; color: #fff; }
		.empty { padding: 2rem; color: #d1d5db; }
		@media (max-width: 900px) { main { grid-template-columns: 1fr; } aside { max-height: none; } }
	</style>
</head>
<body>
	<main>
		<section>
			<header>
				<h1 id="title">Playwright Video Review</h1>
				<p id="subtitle">${videos.length} video${videos.length === 1 ? "" : "s"} sorted by test result path.</p>
			</header>
			<div id="empty" class="empty" hidden>No Playwright videos found under <code>test-results/</code>.</div>
			<video id="player" controls playsinline></video>
			<div class="controls">
				<button id="prev" type="button">Previous</button>
				<button id="next" type="button">Next</button>
				<span id="index"></span>
			</div>
		</section>
		<aside aria-label="Video playlist">
			<ol id="playlist"></ol>
		</aside>
	</main>
	<script>
		const videos = ${videoItems};
		const player = document.getElementById("player");
		const playlist = document.getElementById("playlist");
		const title = document.getElementById("title");
		const index = document.getElementById("index");
		const empty = document.getElementById("empty");
		const prev = document.getElementById("prev");
		const next = document.getElementById("next");
		let current = 0;

		function renderPlaylist() {
			playlist.innerHTML = "";
			videos.forEach((video, i) => {
				const li = document.createElement("li");
				const button = document.createElement("button");
				button.type = "button";
				button.className = "playlist-item";
				button.textContent = video.title;
				button.setAttribute("aria-current", i === current ? "true" : "false");
				button.addEventListener("click", () => load(i));
				li.append(button);
				playlist.append(li);
			});
		}

		function load(i) {
			if (!videos.length) return;
			current = Math.max(0, Math.min(i, videos.length - 1));
			const video = videos[current];
			player.src = video.src;
			title.textContent = video.title;
			index.textContent = String(current + 1) + " / " + String(videos.length);
			prev.disabled = current === 0;
			next.disabled = current === videos.length - 1;
			renderPlaylist();
		}

		prev.addEventListener("click", () => load(current - 1));
		next.addEventListener("click", () => load(current + 1));
		player.addEventListener("ended", () => {
			if (current < videos.length - 1) load(current + 1);
		});

		if (videos.length === 0) {
			empty.hidden = false;
			player.hidden = true;
			prev.disabled = true;
			next.disabled = true;
			index.textContent = "0 / 0";
		} else {
			load(0);
		}
	</script>
</body>
</html>
`;

await writeFile(outputPath, html);
console.log(
	`Wrote ${path.relative(process.cwd(), outputPath)} with ${videos.length} video(s).`,
);
