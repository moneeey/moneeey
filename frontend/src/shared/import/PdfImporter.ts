import * as PDFJS from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry.js";
import { TextItem } from "pdfjs-dist/types/src/display/api";

import MoneeeyStore from "../MoneeeyStore";

import {
	ImportResult,
	ImportTask,
	ProcessContentFn,
	ProcessProgressFn,
} from "./ImportContent";
import { txtImportFromLines } from "./TxtImporter";

PDFJS.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.js";

const pdfImport = function (): ProcessContentFn {
	return async function (
		moneeeyStore: MoneeeyStore,
		data: ImportTask,
		onProgress: ProcessProgressFn,
	): Promise<ImportResult> {
		const preloadSteps = 8;
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
		const pdf = await PDFJS.getDocument(arr).promise;
		step();
		const pdfTxtPages = await Promise.all(
			Array.from({ length: pdf.numPages }, async (_, i) => {
				const page = await pdf.getPage(i + 1);
				step(preloadSteps + pdf.numPages);
				const tokens = await page.getTextContent();
				const txt = tokens.items
					.map((token) => (token as TextItem).str || "")
					.join("");

				return txt;
			}),
		);
		step();
		const pdfTxt = pdfTxtPages.join("\n");
		step();
		const datePattern = data.config.dateFormat
			.replace(/\w/g, "\\w")
			.replace("/", "\\/");
		const pattern = `(?=${datePattern})`;
		const lines = pdfTxt.split(new RegExp(pattern));
		step();

		return txtImportFromLines({ moneeeyStore, data, onProgress, lines });
	};
};

export { pdfImport as default };
