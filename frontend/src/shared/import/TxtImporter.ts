import { compact, head, isEmpty, shuffle } from "lodash";

import { TDateFormat } from "../../utils/Date";
import { asyncProcess, tokenize } from "../../utils/Utils";
import Logger from "../Logger";
import type MoneeeyStore from "../MoneeeyStore";

import TransactionStore from "../../entities/Transaction";
import {
	type ImportResult,
	type ImportTask,
	type ProcessContentFn,
	type ProcessProgressFn,
	findColumns,
	findSeparator,
	importTransaction,
	retrieveColumns,
} from "./ImportContent";

const logger = new Logger("txtImporter", undefined);

const txtImportFromLines = ({
	moneeeyStore,
	data,
	onProgress,
	lines,
	separator = "",
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
	onProgress(30);
	const first10 = lines.slice(0, 10);
	const sep = isEmpty(separator)
		? findSeparator(first10.join("\n"))
		: separator;
	logger.info("txtImportFromLines sep", { first10, sep });
	const columns = findColumns(
		(head(shuffle(first10)) || "").split(sep),
		data.config.dateFormat || TDateFormat,
	);
	logger.info("txtImportFromLines columns", { columns });
	if (columns.dateIndex === -1 || columns.valueIndex === -1) {
		logger.warn("txtImportFromLines date or value column not found", {
			columns,
		});

		return Promise.resolve({
			errors: [
				{
					data: first10.join("\n"),
					description: `${
						columns.dateIndex === -1 ? "Date" : "Value"
					} column not found`,
				},
			],
			recommendedAccounts: {},
			localTransactions,
		});
	}
	onProgress(60);
	const { tokenMap } = importer;
	logger.info("tokenMap", tokenMap);
	onProgress(90);

	return asyncProcess<string, ImportResult>(
		lines,
		(chunk, stt, percentage) => {
			onProgress(percentage);
			for (const line of chunk) {
				const { referenceAccount, dateFormat } = data.config;
				const tokens = line.replace('"', "").split(sep);
				if (tokens.length < 2) {
					stt.errors.push({
						data: line,
						description: `Not enough tokens: ${tokens.join(",")}`,
					});

					return;
				}
				try {
					const { value, date, other } = retrieveColumns(
						tokens,
						columns,
						dateFormat || TDateFormat,
					);
					const query_tokens = compact(other.flatMap(tokenize));
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
