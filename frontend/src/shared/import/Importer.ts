import { compact, filter, flatten, isEmpty, keys } from "lodash";

import { AccountKind, type TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import { shingle } from "../../utils/Utils";
import type MoneeeyStore from "../MoneeeyStore";

export const shinglesForTransaction = (transaction: ITransaction): string[] =>
	compact(
		flatten([
			shingle(transaction.memo),
			shingle(transaction.import_data),
			...transaction.tags.map((tag) => shingle(tag)),
		]),
	);

export const computeIdf = (
	accountShingles: Map<string, string[]>,
): Map<string, number> => {
	const numDocs = accountShingles.size;
	const docFreq = new Map<string, number>();

	for (const shingles of accountShingles.values()) {
		const unique = new Set(shingles);
		for (const s of unique) {
			docFreq.set(s, (docFreq.get(s) || 0) + 1);
		}
	}

	const idf = new Map<string, number>();
	for (const [term, df] of docFreq) {
		idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
	}
	return idf;
};

export const tfIdfVector = (
	shingles: string[],
	idf: Map<string, number>,
): Map<string, number> => {
	const tf = new Map<string, number>();
	for (const s of shingles) {
		tf.set(s, (tf.get(s) || 0) + 1);
	}
	const vec = new Map<string, number>();
	for (const [term, count] of tf) {
		const idfVal = idf.get(term) || 0;
		vec.set(term, count * idfVal);
	}
	return vec;
};

export const cosineSimilarity = (
	a: Map<string, number>,
	b: Map<string, number>,
): number => {
	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (const [key, val] of a) {
		normA += val * val;
		const bVal = b.get(key);
		if (bVal) dot += val * bVal;
	}
	for (const val of b.values()) {
		normB += val * val;
	}

	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

type ScoreMap = { [id: string]: { [shingle: string]: number } };

export type AccountVectors = { scoreMap: ScoreMap; idf: Map<string, number> };

export const buildAccountVectors = (
	transactions: ITransaction[],
): AccountVectors => {
	const accountShingles = transactions.reduce((rs, t) => {
		const shingles = shinglesForTransaction(t);
		for (const acct of compact([t.from_account, t.to_account])) {
			rs.set(acct, [...(rs.get(acct) || []), ...shingles]);
		}
		return rs;
	}, new Map<TAccountUUID, string[]>());

	const idf = computeIdf(accountShingles);

	const scoreMap: ScoreMap = {};
	for (const [acct, shingles] of accountShingles) {
		const vec = tfIdfVector(shingles, idf);
		const obj: Record<string, number> = {};
		for (const [term, weight] of vec) {
			obj[term] = weight;
		}
		scoreMap[acct] = obj;
	}

	return { scoreMap, idf };
};

export const cosineMatchScoreMap = (
	queryShingles: string[],
	scoreMap: ScoreMap,
	idf: Map<string, number>,
) => {
	const queryVec = tfIdfVector(queryShingles, idf);

	return keys(scoreMap)
		.map((id) => {
			const accountVec = new Map(Object.entries(scoreMap[id] || {}));
			const score = cosineSimilarity(queryVec, accountVec);

			const match: Record<string, number> = {};
			for (const [term] of queryVec) {
				const aWeight = accountVec.get(term);
				if (aWeight) {
					match[term] = aWeight;
				}
			}
			const matching = Object.keys(match).length;

			return {
				id,
				score,
				matching,
				domain: accountVec.size,
				total: score,
				match,
			};
		})
		.filter((si) => si.score > 0)
		.sort((a, b) => b.score - a.score);
};

class Importer {
	private moneeeyStore: MoneeeyStore;

	constructor(moneeeyStore: MoneeeyStore) {
		this.moneeeyStore = moneeeyStore;
	}

	get tokenMap(): AccountVectors {
		return buildAccountVectors(this.moneeeyStore.transactions.all);
	}

	findAccountsForTokens(
		referenceAccount: TAccountUUID,
		tokenData: AccountVectors,
		queryTexts: string[],
	) {
		const allShingles = compact(
			flatten(queryTexts.map((s) => shingle(s))),
		);
		const matchingAccounts = cosineMatchScoreMap(
			allShingles,
			tokenData.scoreMap,
			tokenData.idf,
		);
		const nonReferenceAccount = filter(
			flatten(matchingAccounts),
			(match) => !isEmpty(match.id) && match.id !== referenceAccount,
		);

		const accountScore = (account_uuid: TAccountUUID) =>
			this.moneeeyStore.accounts.byUuid(account_uuid)?.kind ===
			AccountKind.PAYEE
				? 0
				: -0.1;

		return nonReferenceAccount
			.map(({ id: account_uuid, ...rest }) => ({
				...rest,
				account_uuid,
				name: this.moneeeyStore.accounts.nameForUuid(account_uuid),
				score: rest.score + accountScore(account_uuid),
			}))
			.sort((a, b) => b.score - a.score);
	}

	findForImportId(import_id: string[]) {
		return this.moneeeyStore.transactions.all.find((t) => {
			const tids = this.importIds(t);

			return import_id.find((id) => tids.includes(id));
		});
	}

	importIds(transaction: ITransaction) {
		return compact([transaction.from_account, transaction.to_account])
			.sort()
			.map(
				(account) =>
					`date=${transaction.date} account=${account} value=${transaction.from_value}`,
			);
	}
}

export default Importer;
