import { isEmpty, shuffle } from "lodash";
import { asyncProcess, tokenize } from "../../utils/Utils";
import Logger from "../Logger";
import type MoneeeyStore from "../MoneeeyStore";

import TransactionStore from "../../entities/Transaction";
import {
	type ImportResult,
	type ImportTask,
	type ProcessContentFn,
	type ProcessProgressFn,
	findMostCommonDateFormat,
	importTransaction,
	retrieveLineColumns,
} from "./ImportContent";

const logger = new Logger("txtImporter", undefined);

const txtImportFromLines = ({
	moneeeyStore,
	data,
	onProgress,
	lines,
}: {
	moneeeyStore: MoneeeyStore;
	data: ImportTask;
	onProgress: ProcessProgressFn;
	lines: string[];
	separator?: string;
}): Promise<ImportResult> => {
	const localTransactions = new TransactionStore(moneeeyStore);
	if (isEmpty(lines)) {
		logger.warn("txtImportFromLines empty lines");

		return Promise.resolve({
			errors: [
				{
					data: "",
					description: "Empty",
				},
			],
			recommendedAccounts: {},
			localTransactions,
		});
	}
	const { importer } = moneeeyStore;
	onProgress(10);
	const { tokenMap } = importer;
	logger.info("tokenMap", tokenMap);
	onProgress(20);

	const samples = shuffle(lines)
		.filter((line) => /\d/.test(line))
		.slice(0, 50);
	const mostCommonDateFormat = findMostCommonDateFormat(samples);
	logger.info("mostCommonDateFormat", { mostCommonDateFormat, samples });
	onProgress(20);

	return asyncProcess<string, ImportResult>(
		lines,
		(chunk, stt, percentage) => {
			onProgress(percentage);
			if (!mostCommonDateFormat || !mostCommonDateFormat.dateFormat) return;
			for (const line of chunk) {
				const { referenceAccount } = data.config;
				try {
					const foundColumns = retrieveLineColumns(
						line,
						mostCommonDateFormat.dateFormat,
					);
					if (!foundColumns) continue;
					const { value, date, other } = foundColumns;
					const query_tokens = tokenize(other);
					const accounts = importer.findAccountsForTokens(
						referenceAccount,
						tokenMap,
						query_tokens,
					);
					const other_account = accounts[0]?.account_uuid || "";
					const { transaction, existing } = importTransaction({
						date,
						line,
						value,
						referenceAccount,
						other_account,
						importer,
					});
					logger.info("process line", {
						line,
						value,
						date,
						other,
						other_account,
						query_tokens,
						recommendedAccounts: accounts,
						transaction,
						existing,
					});
					stt.localTransactions.merge(transaction);
					stt.recommendedAccounts[transaction.transaction_uuid] = accounts.map(
						(a) => a.account_uuid,
					);
				} catch (err) {
					logger.error("process line error", { err, line });
					stt.errors.push({
						data: String(err),
						description: "process line error",
					});
				}
			}
		},
		{
			state: {
				errors: [],
				recommendedAccounts: {},
				localTransactions,
			},
		},
	);
};

const txtImport =
	(): ProcessContentFn =>
	async (
		moneeeyStore: MoneeeyStore,
		data: ImportTask,
		onProgress: ProcessProgressFn,
	): Promise<ImportResult> => {
		onProgress(30);
		const text = (await data.input.contents.text()).replace("\r", "\n");
		onProgress(60);
		const lines = text.split("\n").filter((line) => line.trim().length !== 0);
		onProgress(90);

		return txtImportFromLines({
			moneeeyStore,
			data,
			onProgress,
			lines,
		});
	};

export { txtImport, txtImport as default, txtImportFromLines };
