import {
	type ITransaction,
	mockTransaction,
} from "../../entities/Transaction";
import { shingle } from "../../utils/Utils";

import {
	buildAccountVectors,
	computeIdf,
	cosineMatchScoreMap,
	cosineSimilarity,
	shinglesForTransaction,
	tfIdfVector,
} from "./Importer";

const sampleTransactions: ITransaction[] = [
	mockTransaction({
		transaction_uuid: "t1",
		from_account: "banco",
		to_account: "fernando",
		memo: "transfer to fernando",
		from_value: 123,
	}),
	mockTransaction({
		transaction_uuid: "t2",
		from_account: "banco",
		to_account: "chocolate",
		memo: "transfer to chocolate",
		from_value: 20,
	}),
	mockTransaction({
		transaction_uuid: "t3",
		from_account: "banco",
		to_account: "lua",
		memo: "transfer to lua",
		from_value: 20,
	}),
	mockTransaction({
		transaction_uuid: "t4",
		from_account: "banco",
		to_account: "market_dolly",
		memo: "groceries dolly market",
		tags: ["groceries"],
		from_value: 20,
	}),
	mockTransaction({
		transaction_uuid: "t5",
		from_account: "xyz_company",
		to_account: "banco",
		memo: "salary xyz company",
		from_value: 300,
	}),
	mockTransaction({
		transaction_uuid: "t6",
		from_account: "banco",
		to_account: "market_super",
		memo: "super market",
		tags: ["groceries"],
		from_value: 300,
	}),
];

describe("Importer", () => {
	it("shingle", () => {
		expect(shingle("hello 7/21 world 30% coupon")).toEqual([
			"hel",
			"ell",
			"llo",
			"lo7",
			"o72",
			"721",
			"21w",
			"1wo",
			"wor",
			"orl",
			"rld",
			"ld3",
			"d30",
			"30c",
			"0co",
			"cou",
			"oup",
			"upo",
			"pon",
		]);
	});

	it("shinglesForTransaction", () => {
		const transaction = mockTransaction({
			transaction_uuid: "t1",
			from_account: "a",
			to_account: "b",
			from_value: 12,
			memo: "hello de world",
			tags: ["tagX"],
		});

		expect(shinglesForTransaction(transaction)).toEqual([
			...shingle("hello de world"),
			...shingle("tagX"),
		]);
	});

	it("computeIdf", () => {
		const accountShingles = new Map([
			["a", ["abc", "bcd", "cde"]],
			["b", ["abc", "xyz"]],
			["c", ["xyz", "yzw"]],
		]);

		const idf = computeIdf(accountShingles);

		expect(idf.get("abc")).toBeCloseTo(Math.log(4 / 3) + 1);
		expect(idf.get("bcd")).toBeCloseTo(Math.log(4 / 2) + 1);
		expect(idf.get("xyz")).toBeCloseTo(Math.log(4 / 3) + 1);
	});

	it("tfIdfVector", () => {
		const idf = new Map([
			["abc", 1.5],
			["bcd", 2.0],
		]);
		const vec = tfIdfVector(["abc", "abc", "bcd"], idf);

		expect(vec.get("abc")).toBe(3.0);
		expect(vec.get("bcd")).toBe(2.0);
	});

	describe("cosineSimilarity", () => {
		it("identical vectors return 1", () => {
			const v = new Map([
				["a", 1],
				["b", 2],
			]);
			expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
		});

		it("orthogonal vectors return 0", () => {
			const a = new Map([["x", 1]]);
			const b = new Map([["y", 1]]);
			expect(cosineSimilarity(a, b)).toBe(0);
		});

		it("empty vector returns 0", () => {
			const a = new Map<string, number>();
			const b = new Map([["x", 1]]);
			expect(cosineSimilarity(a, b)).toBe(0);
		});
	});

	const sampleVectors = () => buildAccountVectors(sampleTransactions);

	describe("cosineMatchScoreMap", () => {
		const queryMatch = (text: string) => {
			const { scoreMap, idf } = sampleVectors();
			const queryShingles = shingle(text);
			return {
				query: text,
				result: cosineMatchScoreMap(queryShingles, scoreMap, idf),
			};
		};

		it("transfer to fernando ranks fernando first", () => {
			const { result } = queryMatch("transfer to fernando");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].id).toBe("fernando");
		});

		it("transfer to chocolate ranks chocolate first", () => {
			const { result } = queryMatch("transfer to chocolate");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].id).toBe("chocolate");
		});

		it("market ranks market_dolly and market_super as top matches", () => {
			const { result } = queryMatch("market");
			expect(result.length).toBeGreaterThanOrEqual(2);
			const topTwo = result.slice(0, 2).map((r) => r.id).sort();
			expect(topTwo).toEqual(["market_dolly", "market_super"]);
		});

		it("salary ranks xyz_company first", () => {
			const { result } = queryMatch("salary");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].id).toBe("xyz_company");
		});

		it("groceries ranks market accounts highest", () => {
			const { result } = queryMatch("groceries");
			expect(result.length).toBeGreaterThanOrEqual(2);
			const topTwo = result.slice(0, 2).map((r) => r.id).sort();
			expect(topTwo).toEqual(["market_dolly", "market_super"]);
		});

		it("returns empty for completely unrelated query", () => {
			const { scoreMap, idf } = sampleVectors();
			const result = cosineMatchScoreMap(["zzz"], scoreMap, idf);
			expect(result).toEqual([]);
		});
	});
});
