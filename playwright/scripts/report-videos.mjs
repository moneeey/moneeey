import { execFile } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(playwrightDir, "..");
const resultsDir = path.join(playwrightDir, "test-results");
const metadataPath = path.join(resultsDir, ".video-metadata.json");
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

async function readMetadata() {
	try {
		const raw = await readFile(metadataPath, "utf8");
		return new Map(JSON.parse(raw).map((item) => [item.src, item]));
	} catch (err) {
		if (err?.code === "ENOENT") return new Map();
		throw err;
	}
}

async function git(args) {
	const { stdout } = await execFileAsync("git", args, { cwd: repoRoot });
	return stdout.trim();
}

async function changedTestFiles() {
	try {
		const base = await git(["merge-base", "HEAD", "origin/main"]);
		const output = await git([
			"diff",
			"--name-only",
			"--diff-filter=ACMR",
			base,
			"HEAD",
			"--",
			"playwright/tests",
		]);
		return new Set(
			output
				.split("\n")
				.filter(Boolean)
				.map((file) => path.relative(playwrightDir, path.join(repoRoot, file))),
		);
	} catch {
		return new Set();
	}
}

function projectFromResultName(resultName) {
	const match = resultName.match(/-(chromium|firefox)(?:-retry\d+)?$/);
	return match?.[1] ?? "unknown";
}

function fallbackTitle(resultName) {
	return resultName
		.replace(/-(chromium|firefox)(?:-retry\d+)?$/, "")
		.replace(/-/g, " ");
}

function displayTitle(item, fallback) {
	const titlePath = item?.titlePath?.filter(Boolean) ?? [];
	const titleParts = titlePath.filter(
		(part) =>
			part !== item?.project && !part.endsWith(".ts") && !part.endsWith(".tsx"),
	);
	if (titleParts.length) return titleParts.join(" › ");
	return item?.title ?? fallback;
}

const metadata = await readMetadata();
const changedFiles = await changedTestFiles();

const videos = (
	await Promise.all(
		(
			await walk(resultsDir)
		).map(async (filePath) => {
			const relativePath = path.relative(playwrightDir, filePath);
			const src = relativePath.split(path.sep).join("/");
			const resultName = path
				.dirname(relativePath)
				.replace(/^test-results\//, "");
			const info = await stat(filePath);
			const item = metadata.get(src);
			const file = item?.file;
			const title = displayTitle(item, fallbackTitle(resultName));
			return {
				title,
				titlePath: item?.titlePath ?? [],
				compareKey: [file ?? "", item?.line ?? "", title].join("|"),
				project: item?.project ?? projectFromResultName(resultName),
				file: file ?? "",
				line: item?.line ?? null,
				status: item?.status ?? "unknown",
				retry: item?.retry ?? 0,
				duration: item?.duration ?? null,
				recentlyChanged: file ? changedFiles.has(file) : false,
				src,
				size: info.size,
			};
		}),
	)
).sort(
	(a, b) =>
		a.title.localeCompare(b.title) ||
		a.project.localeCompare(b.project) ||
		a.src.localeCompare(b.src),
);

const videoItems = JSON.stringify(videos, null, 2).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Playwright Video Review</title>
	<style>
		:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
		body { margin: 0; background: #0f172a; color: #f8fafc; }
		main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem); gap: 1rem; min-height: 100vh; padding: 1rem; box-sizing: border-box; }
		section, aside { background: #111827; border: 1px solid #334155; border-radius: 0.85rem; box-shadow: 0 18px 48px rgb(0 0 0 / 0.24); }
		section { display: flex; flex-direction: column; min-width: 0; }
		header { padding: 1rem; border-bottom: 1px solid #334155; }
		h1 { margin: 0; font-size: 1.25rem; line-height: 1.35; }
		p { margin: 0.45rem 0 0; color: #cbd5e1; }
		code { color: #93c5fd; }
		video { width: 100%; max-height: calc(100vh - 15rem); background: #020617; }
		.compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 0.75rem; padding: 0.75rem; }
		.compare-card { overflow: hidden; border: 1px solid #334155; border-radius: 0.75rem; background: #020617; }
		.compare-card video { display: block; max-height: calc(100vh - 18rem); }
		.compare-title { display: flex; gap: 0.5rem; align-items: center; padding: 0.6rem 0.7rem; color: #cbd5e1; font-weight: 750; }
		.controls { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 1rem; border-top: 1px solid #334155; }
		button, select, input { font: inherit; }
		button { border: 0; border-radius: 0.55rem; padding: 0.55rem 0.8rem; background: #60a5fa; color: #0f172a; font-weight: 750; cursor: pointer; }
		button:disabled { cursor: not-allowed; opacity: 0.45; }
		label { display: flex; gap: 0.35rem; align-items: center; color: #cbd5e1; }
		select, input[type="search"] { border: 1px solid #475569; border-radius: 0.55rem; padding: 0.5rem; background: #020617; color: #f8fafc; }
		input[type="search"] { width: 100%; box-sizing: border-box; }
		#index { margin-left: auto; color: #cbd5e1; font-variant-numeric: tabular-nums; }
		aside { overflow: hidden; max-height: calc(100vh - 2rem); display: flex; flex-direction: column; }
		.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; padding: 0.75rem; border-bottom: 1px solid #334155; }
		.filters label:first-child { grid-column: 1 / -1; align-items: stretch; flex-direction: column; }
		.filters .changed-only { grid-column: 1 / -1; }
		ol { list-style: none; margin: 0; padding: 0.5rem; overflow: auto; }
		li { margin: 0; }
		.playlist-item { width: 100%; text-align: left; display: grid; gap: 0.35rem; background: transparent; color: #e2e8f0; border-radius: 0.65rem; padding: 0.7rem; font-weight: 500; }
		.playlist-item:hover, .playlist-item[aria-current="true"] { background: #1e293b; color: #fff; }
		.item-title { font-weight: 750; line-height: 1.25; }
		.item-meta { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; color: #94a3b8; font-size: 0.82rem; }
		.badge { display: inline-flex; align-items: center; border: 1px solid #475569; border-radius: 999px; padding: 0.1rem 0.45rem; color: #cbd5e1; }
		.badge.changed { border-color: #f59e0b; color: #fbbf24; }
		.badge.chromium { border-color: #60a5fa; color: #93c5fd; }
		.badge.firefox { border-color: #fb7185; color: #fda4af; }
		.empty { padding: 2rem; color: #cbd5e1; }
		@media (max-width: 900px) { main { grid-template-columns: 1fr; } aside { max-height: none; } }
	</style>
</head>
<body>
	<main>
		<section>
			<header>
				<h1 id="title">Playwright Video Review</h1>
				<p id="subtitle">${videos.length} video${videos.length === 1 ? "" : "s"} sorted by Playwright test title. Tests changed since <code>origin/main</code> are highlighted.</p>
			</header>
			<div id="empty" class="empty" hidden>No Playwright videos found under <code>test-results/</code>.</div>
			<div id="compare" class="compare-grid" hidden></div>
			<video id="player" controls playsinline></video>
			<div class="controls">
				<button id="prev" type="button">Previous</button>
				<button id="next" type="button">Next</button>
				<label><input id="compareMode" type="checkbox" checked /> Compare browsers</label>
				<label for="speed">Speed
					<select id="speed">
						<option value="0.25">0.25x</option>
						<option value="0.5" selected>0.5x</option>
						<option value="0.75">0.75x</option>
						<option value="1">1x</option>
					</select>
				</label>
				<span id="index"></span>
			</div>
		</section>
		<aside aria-label="Video playlist">
			<div class="filters">
				<label for="query">Search
					<input id="query" type="search" placeholder="Test title or file" />
				</label>
				<label for="project">Browser
					<select id="project"></select>
				</label>
				<label for="status">Status
					<select id="status"></select>
				</label>
				<label class="changed-only"><input id="changedOnly" type="checkbox" /> Changed tests only</label>
			</div>
			<ol id="playlist"></ol>
		</aside>
	</main>
	<script>
		const videos = ${videoItems};
		const player = document.getElementById("player");
		const compare = document.getElementById("compare");
		const playlist = document.getElementById("playlist");
		const title = document.getElementById("title");
		const index = document.getElementById("index");
		const empty = document.getElementById("empty");
		const prev = document.getElementById("prev");
		const next = document.getElementById("next");
		const compareMode = document.getElementById("compareMode");
		const speed = document.getElementById("speed");
		const query = document.getElementById("query");
		const project = document.getElementById("project");
		const status = document.getElementById("status");
		const changedOnly = document.getElementById("changedOnly");
		let currentSrc = videos[0]?.src ?? null;
		let playbackRate = Number(speed.value);
		let filteredVideos = videos;

		function optionsFor(field) {
			return ["all", ...Array.from(new Set(videos.map((video) => video[field]).filter(Boolean))).sort()];
		}

		function fillSelect(select, values) {
			select.innerHTML = "";
			for (const value of values) {
				const option = document.createElement("option");
				option.value = value;
				option.textContent = value === "all" ? "All" : value;
				select.append(option);
			}
		}

		function matches(video) {
			const needle = query.value.trim().toLowerCase();
			const haystack = [video.title, video.file, video.project, video.status].join(" ").toLowerCase();
			return (!needle || haystack.includes(needle)) &&
				(project.value === "all" || video.project === project.value) &&
				(status.value === "all" || video.status === status.value) &&
				(!changedOnly.checked || video.recentlyChanged);
		}

		function filteredIndex() {
			return Math.max(0, filteredVideos.findIndex((video) => video.src === currentSrc));
		}

		function comparisonVideos(video) {
			return videos
				.filter((candidate) => candidate.compareKey === video.compareKey)
				.sort((a, b) => a.project.localeCompare(b.project));
		}

		function renderCompare(items) {
			player.pause();
			player.removeAttribute("src");
			player.load();
			player.hidden = true;
			compare.hidden = false;
			compare.innerHTML = "";
			for (const item of items) {
				const card = document.createElement("div");
				card.className = "compare-card";
				const cardTitle = document.createElement("div");
				cardTitle.className = "compare-title";
				const projectBadge = document.createElement("span");
				projectBadge.className = "badge " + item.project;
				projectBadge.textContent = item.project;
				const statusBadge = document.createElement("span");
				statusBadge.className = "badge";
				statusBadge.textContent = item.status;
				cardTitle.append(projectBadge, statusBadge);
				const videoEl = document.createElement("video");
				videoEl.controls = true;
				videoEl.playsInline = true;
				videoEl.src = item.src;
				videoEl.playbackRate = playbackRate;
				card.append(cardTitle, videoEl);
				compare.append(card);
			}
		}

		function renderPlaylist() {
			playlist.innerHTML = "";
			filteredVideos.forEach((video) => {
				const li = document.createElement("li");
				const button = document.createElement("button");
				button.type = "button";
				button.className = "playlist-item";
				button.setAttribute("aria-current", video.src === currentSrc ? "true" : "false");
				const itemTitle = document.createElement("span");
				itemTitle.className = "item-title";
				itemTitle.textContent = video.title;
				const meta = document.createElement("span");
				meta.className = "item-meta";
				const projectBadge = document.createElement("span");
				projectBadge.className = "badge " + video.project;
				projectBadge.textContent = video.project;
				meta.append(projectBadge);
				if (video.recentlyChanged) {
					const changed = document.createElement("span");
					changed.className = "badge changed";
					changed.textContent = "changed";
					meta.append(changed);
				}
				const file = document.createElement("span");
				file.textContent = video.file ? video.file + (video.line ? ":" + video.line : "") : video.src;
				meta.append(file);
				button.append(itemTitle, meta);
				button.addEventListener("click", () => load(video.src));
				li.append(button);
				playlist.append(li);
			});
		}

		function applyFilters() {
			filteredVideos = videos.filter(matches);
			if (!filteredVideos.some((video) => video.src === currentSrc)) {
				currentSrc = filteredVideos[0]?.src ?? null;
			}
			if (currentSrc) load(currentSrc, false);
			else renderEmpty();
		}

		function renderEmpty() {
			empty.hidden = false;
			player.hidden = true;
			compare.hidden = true;
			compare.innerHTML = "";
			prev.disabled = true;
			next.disabled = true;
			title.textContent = videos.length ? "No matching videos" : "Playwright Video Review";
			index.textContent = "0 / " + String(filteredVideos.length);
			renderPlaylist();
		}

		function load(src, render = true) {
			if (!filteredVideos.length) return renderEmpty();
			currentSrc = src;
			const current = filteredIndex();
			const video = filteredVideos[current];
			empty.hidden = true;
			const comparison = comparisonVideos(video);
			if (compareMode.checked && comparison.length > 1) {
				renderCompare(comparison);
			} else {
				compare.hidden = true;
				compare.innerHTML = "";
				player.hidden = false;
				player.src = video.src;
				player.playbackRate = playbackRate;
			}
			title.textContent = video.title;
			index.textContent = String(current + 1) + " / " + String(filteredVideos.length);
			prev.disabled = current === 0;
			next.disabled = current === filteredVideos.length - 1;
			if (render) renderPlaylist();
		}

		prev.addEventListener("click", () => load(filteredVideos[filteredIndex() - 1].src));
		next.addEventListener("click", () => load(filteredVideos[filteredIndex() + 1].src));
		speed.addEventListener("change", () => {
			playbackRate = Number(speed.value);
			player.playbackRate = playbackRate;
			for (const videoEl of compare.querySelectorAll("video")) {
				videoEl.playbackRate = playbackRate;
			}
		});
		compareMode.addEventListener("change", () => {
			if (currentSrc) load(currentSrc);
		});
		player.addEventListener("ended", () => {
			const current = filteredIndex();
			if (current < filteredVideos.length - 1) load(filteredVideos[current + 1].src);
		});
		for (const control of [query, project, status, changedOnly]) {
			control.addEventListener("input", applyFilters);
			control.addEventListener("change", applyFilters);
		}

		fillSelect(project, optionsFor("project"));
		fillSelect(status, optionsFor("status"));
		applyFilters();
	</script>
</body>
</html>
`;

await writeFile(outputPath, html);
console.log(
	`Wrote ${path.relative(process.cwd(), outputPath)} with ${videos.length} video(s).`,
);
