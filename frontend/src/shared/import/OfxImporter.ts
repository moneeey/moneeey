// TOOD: Houston, this file is a problem!! Remove all eslint-disable!

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import _, { map } from "lodash";
import * as ofx from "node-ofx-parser";

import { formatDateFmt, parseDateFmt } from "../../utils/Date";

import MoneeeyStore from "../MoneeeyStore";

import {
	ImportResult,
	ImportTask,
	ProcessContentFn,
	ProcessProgressFn,
} from "./ImportContent";
import { txtImportFromLines } from "./TxtImporter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findBankTranlists = (obj: any): any[] => {
	if (typeof obj === "object") {
		return _(obj)
			.entries()
			.flatMap(([k, v]) => {
				if (typeof v === "object" && k !== "BANKTRANLIST") {
					return findBankTranlists(v);
				} else if (typeof v === "object" && k === "BANKTRANLIST") {
					return v.STMTTRN;
				}

				return [];
			})
			.flatten()
			.value();
	}

	return [];
};

const ofxImport = function (): ProcessContentFn {
	return async function (
		moneeeyStore: MoneeeyStore,
		data: ImportTask,
		onProgress: ProcessProgressFn,
	): Promise<ImportResult> {
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
};

export { ofxImport as default };
