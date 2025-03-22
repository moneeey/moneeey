import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.mjs";

import type MoneeeyStore from "../MoneeeyStore";

import type {
	ImportResult,
	ImportTask,
	ProcessContentFn,
	ProcessProgressFn,
} from "./ImportContent";
import { txtImportFromLines } from "./TxtImporter";

GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.js";

const pdfImport =
	(): ProcessContentFn =>
	async (
		moneeeyStore: MoneeeyStore,
		data: ImportTask,
		onProgress: ProcessProgressFn,
	): Promise<ImportResult> => {
		const preloadSteps = 7;
		let loadStep = 1;
		const step = (totalTasks = preloadSteps) => {
			onProgress(loadStep / totalTasks);
			loadStep += 1;
		};
		step();
		const buff = await data.input.contents.arrayBuffer();
		step();
		const arr = new Uint8Array(buff);
		step();
		const pdf = await getDocument(arr).promise;
		step();
		const pdfTxtPages = await Promise.all(
			Array.from({ length: pdf.numPages }, async (_, i) => {
				const page = await pdf.getPage(i + 1);
				step(preloadSteps + pdf.numPages);
				const tokens = await page.getTextContent();
				let txt = "";
				let lineTop = -1;
				for (const token of tokens.items) {
					if ("str" in token) {
						const tokenTop = Number(token.transform[5]);
						if (tokenTop !== lineTop) {
							txt += "\n";
							lineTop = tokenTop;
						}
						txt += `${token.str.trim()} `;
					}
				}
				return txt.trim();
			}),
		);
		step();
		const pdfTxt = pdfTxtPages.join("\n\n").replace("\r", "\n");
		step();
		const lines = pdfTxt.split("\n").map((line) => line.trim());

		return txtImportFromLines({ moneeeyStore, data, onProgress, lines });
	};

export default pdfImport;
