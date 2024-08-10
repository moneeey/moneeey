import type { TAccountUUID } from "../../entities/Account";
import type {
	ITransaction,
	TTransactionUUID,
} from "../../entities/Transaction";
import {
	MostCommonDateFormats,
	currentDateTime,
	formatDate,
	formatDateFmt,
	parseDateFmt,
} from "../../utils/Date";
import { uuid } from "../../utils/Utils";
import { EntityType } from "../Entity";

import type MoneeeyStore from "../MoneeeyStore";

import type TransactionStore from "../../entities/Transaction";
import type Importer from "./Importer";

export type FileUploaderMode = "txt" | "csv" | "ofx" | "pdf";

export interface ImportInput {
	name: string;
	contents: File;
	mode: FileUploaderMode;
}

export interface ImportConfig {
	referenceAccount: string;
}

export interface ImportTask {
	taskId: string;
	input: ImportInput;
	config: ImportConfig;
}

export interface ImportResult {
	errors: {
		data: string;
		description: string;
	}[];
	recommendedAccounts: Record<TTransactionUUID, TAccountUUID[]>;
	localTransactions: TransactionStore;
}

export type ProcessProgressFn = (percentage: number) => void;
export type ProcessContentFn = (
	moneeeyStore: MoneeeyStore,
	data: ImportTask,
	onProgress: ProcessProgressFn,
) => Promise<ImportResult>;

const MostCommonDatePatterns = MostCommonDateFormats.map((dateFormat) => ({
	dateFormat,
	pattern: new RegExp(
		`\\b${formatDateFmt(new Date(), dateFormat)
			.replace(/[A-Za-z]/g, "[A-Za-z]")
			.replace(/\d/g, "\\d")}\\b`,
	),
}));

const retrieveFirstFoundDate = (line: string, dateFormat: string) => {
	const fmt = MostCommonDatePatterns.find(
		(item) => item.dateFormat === dateFormat,
	);
	if (fmt) {
		const { pattern } = fmt;
		const match = pattern.exec(line);
		if (match) {
			const dateStr = match[0];
			try {
				const date = formatDate(parseDateFmt(dateStr, dateFormat));
				return { date, rest: line.replace(dateStr, "") };
			} catch (e) {}
		}
	}
	return null;
};

export const findMostCommonDateFormat = (lines: string[]) => {
	let topAmount = 0;
	let topPattern = undefined;
	const patterns = new Map<string, number>();
	for (const line of lines) {
		for (const { pattern, dateFormat } of MostCommonDatePatterns) {
			if (pattern.test(line) && retrieveFirstFoundDate(line, dateFormat)) {
				const occurrencies = (patterns.get(dateFormat) || 0) + 1;
				patterns.set(dateFormat, occurrencies);
				if (occurrencies > topAmount) {
					topAmount = occurrencies;
					topPattern = { pattern, dateFormat };
				}
			}
		}
	}
	return topPattern;
};

export function parseWeirdAmount(input: string) {
	// Remove any leading/trailing whitespace
	const amountStr = input.trim();

	// Identify the last occurrence of a comma or period to separate integer and decimal parts
	const lastCommaIndex = amountStr.lastIndexOf(",");
	const lastPeriodIndex = amountStr.lastIndexOf(".");

	// Determine which is the decimal separator
	const decimalSeparatorIndex = Math.max(lastCommaIndex, lastPeriodIndex);
	let integerPart = amountStr;
	let decimalPart = "";

	// Split the string into integer and decimal parts
	if (decimalSeparatorIndex !== -1) {
		integerPart = amountStr.slice(0, decimalSeparatorIndex);
		decimalPart = amountStr.slice(decimalSeparatorIndex + 1);
	}

	// Remove any thousand separators (spaces, commas, or periods) from the integer part
	integerPart = integerPart.replace(/[\s,.]/g, "");

	// Reconstruct the normalized string
	let normalizedStr = integerPart;
	if (decimalPart) {
		normalizedStr += `.${decimalPart}`;
	}

	// Convert the string to a floating-point number
	return Number.parseFloat(normalizedStr);
}

export const extractValueAndOther = (rest: string) => {
	const amountMatch = /(?:\b|[ +-])*\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?\b/.exec(
		rest,
	);
	if (amountMatch) {
		const amountStr = amountMatch[0];
		const other = rest
			.replace(amountStr, "")
			.replace(/[^\w\s\d]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		const value = parseWeirdAmount(amountStr);
		return { other, value };
	}
	return null;
};

export const retrieveLineColumns = (line: string, dateFormat: string) => {
	const dateFound = retrieveFirstFoundDate(line, dateFormat);
	if (dateFound) {
		const { date, rest } = dateFound;
		const amountMatch =
			/(?:\b|[+-])?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?\b/.exec(rest);
		if (amountMatch) {
			const valueAndOther = extractValueAndOther(rest);
			if (valueAndOther) {
				const { value, other } = valueAndOther;
				return {
					value,
					other,
					date,
				};
			}
		}
	}
	return null;
};

export const importTransaction = ({
	date,
	line,
	value,
	referenceAccount,
	other_account,
	importer,
}: {
	date: string;
	line: string;
	value: number;
	referenceAccount: TAccountUUID;
	other_account: TAccountUUID;
	importer: Importer;
}) => {
	const transaction: ITransaction = {
		entity_type: EntityType.TRANSACTION,
		transaction_uuid: uuid(),
		date,
		memo: line,
		tags: [],
		from_account: value < 0 ? referenceAccount : other_account,
		to_account: value < 0 ? other_account : referenceAccount,
		from_value: Math.abs(value),
		to_value: Math.abs(value),
		import_data: line,
		updated: currentDateTime(),
	};
	const import_id = importer.importIds(transaction);
	const existing = importer.findForImportId(import_id);
	if (existing) {
		transaction.transaction_uuid = existing.transaction_uuid;
		transaction.memo = existing.memo;
		if ((transaction.memo || "").indexOf(line) === -1) {
			transaction.memo = `${transaction.memo};${line}`;
		}
		transaction.tags = existing.tags;
		transaction.from_account =
			transaction.from_account || existing.from_account;
		transaction.to_account = transaction.to_account || existing.to_account;
		transaction._rev = existing._rev;
	}

	return { transaction, existing };
};
