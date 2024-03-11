// TOOD: Houston, this file is a problem!! Remove all biome bypasses
import _, { map } from "lodash";
import * as ofx from "node-ofx-parser";

import { formatDateFmt, parseDateFmt } from "../../utils/Date";

import type MoneeeyStore from "../MoneeeyStore";

import type {
	ImportResult,
	ImportTask,
	ProcessContentFn,
	ProcessProgressFn,
} from "./ImportContent";
import { txtImportFromLines } from "./TxtImporter";

const findBankTranlists = (obj: any): any[] => {
	if (typeof obj === "object") {
		return _(obj)
			.entries()
			.flatMap(([k, v]) => {
				if (typeof v === "object" && k !== "BANKTRANLIST") {
					return findBankTranlists(v);
				}
				if (typeof v === "object" && k === "BANKTRANLIST") {
					return v.STMTTRN;
				}

				return [];
			})
			.flatten()
			.value();
	}

	return [];
};

const ofxImport =
	(): ProcessContentFn =>
	async (
		moneeeyStore: MoneeeyStore,
		data: ImportTask,
		onProgress: ProcessProgressFn,
	): Promise<ImportResult> => {
		const preloadSteps = 9;
		const SEP = "@";
		let loadStep = 1;
		const step = () => {
			onProgress(loadStep / preloadSteps);
			loadStep += 1;
		};
		step();
		const buff = await data.input.contents.text();
		step();
		const parsedOfx = ofx.parse(buff);
		step();
		const transactions = findBankTranlists(parsedOfx);
		step();
		const lines: string[] = map(transactions, (t) => {
			if (t && typeof t === "object") {
				const ofxDateFormat = "yyyyMMdd";
				const dtposted = `${t.DTPOSTED}` || "";
				const datets = parseDateFmt(
					dtposted.slice(0, ofxDateFormat.length),
					ofxDateFormat,
				);
				const date = formatDateFmt(datets, data.config.dateFormat);
				const value = t.TRNAMT;
				const other = t.MEMO;

				return `${date}${SEP}${value}${SEP}${other}`;
			}

			return "";
		});

		return txtImportFromLines({
			moneeeyStore,
			data,
			onProgress,
			lines,
			separator: SEP,
		});
	};

export { ofxImport as default };
