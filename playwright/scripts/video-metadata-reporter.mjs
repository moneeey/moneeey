import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightDir = path.resolve(scriptDir, "..");
const resultsDir = path.join(playwrightDir, "test-results");
const metadataPath = path.join(resultsDir, ".video-metadata.json");

function normalizePath(filePath) {
	return path.relative(playwrightDir, filePath).split(path.sep).join("/");
}

function projectFromVideoPath(filePath) {
	const resultDir = path.basename(path.dirname(filePath));
	const match = resultDir.match(/-(chromium|firefox)(?:-retry\d+)?$/);
	return match?.[1] ?? "unknown";
}

class VideoMetadataReporter {
	constructor() {
		this.items = [];
	}

	onTestEnd(test, result) {
		for (const attachment of result.attachments) {
			if (attachment.name !== "video" || !attachment.path) continue;
			this.items.push({
				src: normalizePath(attachment.path),
				title: test.title,
				titlePath: test.titlePath(),
				file: normalizePath(test.location.file),
				line: test.location.line,
				project: projectFromVideoPath(attachment.path),
				status: result.status,
				retry: result.retry,
				duration: result.duration,
			});
		}
	}

	async onEnd() {
		await mkdir(resultsDir, { recursive: true });
		await writeFile(metadataPath, `${JSON.stringify(this.items, null, 2)}\n`);
	}
}

export default VideoMetadataReporter;
