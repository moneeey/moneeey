import { type ITransaction, mockTransaction } from "../../entities/Transaction";
import { tokenize } from "../../utils/Utils";

import {
	tokenMatchScoreMap,
	tokenTopScores,
	tokenTransactionAccountScoreMap,
	tokenWeightMap,
	tokensForTransactions,
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
	it("tokenize", () => {
		expect(tokenize("hello 7/21 world 30% coupon")).toEqual([
			"hello",
			"world",
			"coupon",
		]);
		expect(tokenize("some@bad*boys")).toEqual(["some", "bad", "boys"]);
	});

	it("tokenScoreMap simple", () => {
		const tokens = "1223334444".split("");

		expect(tokenWeightMap(tokens)).toMatchInlineSnapshot(`
      Map {
        "1" => 0.9,
        "2" => 0.8,
        "3" => 0.7,
        "4" => 0.6,
      }
    `);
	});

	it("tokenScoreMap random numbers", () => {
		const tokens =
			"2836788741484086466019596043251807718469095087302450890762989257138040064396808737591754583512735764".split(
				"",
			);

		expect(tokenWeightMap(tokens)).toMatchInlineSnapshot(`
      Map {
        "2" => 0.94,
        "8" => 0.86,
        "3" => 0.92,
        "6" => 0.9,
        "7" => 0.88,
        "4" => 0.89,
        "1" => 0.9299999999999999,
        "0" => 0.87,
        "9" => 0.91,
        "5" => 0.9,
      }
    `);
	});

	it("tokenTopScores", () => {
		const scores = new Map([
			["fernando", 0.9],
			["gas", 0.9],
			["oil", 0.9],
			["pix", 0.8],
			["restaurant", 0.9],
			["station", 0.9],
			["transaction", 0.7],
		]);

		expect(
			tokenTopScores(["transaction", "pix", "fernando", "pix"], scores),
		).toEqual([
			{ score: 0.9, token: "fernando" },
			{ score: 0.8, token: "pix" },
			{ score: 0.7, token: "transaction" },
		]);
	});

	it("tokenTransactionScoreMap", () => {
		const transaction = mockTransaction({
			transaction_uuid: "t1",
			from_account: "a",
			to_account: "b",
			from_value: 12,
			memo: "hello de world",
			tags: ["tagX"],
		});

		expect(tokensForTransactions(transaction)).toEqual([
			"hello",
			"world",
			"tagx",
		]);
	});

	const sampleScoreMap = () =>
		tokenTransactionAccountScoreMap(sampleTransactions);

	it("tokenTransactionAccountScoreMap", () => {
		expect(sampleScoreMap()).toMatchInlineSnapshot(`
      {
        "banco": {
          "chocolate": 0.9375,
          "company": 0.9375,
          "dolly": 0.9375,
          "fernando": 0.9375,
          "groceries": 0.8125,
          "lua": 0.9375,
          "market": 0.875,
          "salary": 0.9375,
          "super": 0.9375,
          "transfer": 0.8125,
          "xyz": 0.9375,
        },
        "chocolate": {
          "chocolate": 0.9375,
          "transfer": 0.8125,
        },
        "fernando": {
          "fernando": 0.9375,
          "transfer": 0.8125,
        },
        "lua": {
          "lua": 0.9375,
          "transfer": 0.8125,
        },
        "market_dolly": {
          "dolly": 0.9375,
          "groceries": 0.8125,
          "market": 0.875,
        },
        "market_super": {
          "groceries": 0.8125,
          "market": 0.875,
          "super": 0.9375,
        },
        "xyz_company": {
          "company": 0.9375,
          "salary": 0.9375,
          "xyz": 0.9375,
        },
      }
    `);
	});

	describe("tokenMatchScoreMap", () => {
		const queryTokenMatchScoreMap = (tokens: string[]) => ({
			query: tokens,
			result: tokenMatchScoreMap(tokens, sampleScoreMap()),
		});

		it("transfer to fernando", () => {
			expect(
				queryTokenMatchScoreMap(["transfer", "to", "fernando"]),
			).toMatchInlineSnapshot(`
        {
          "query": [
            "transfer",
            "to",
            "fernando",
          ],
          "result": [
            {
              "domain": 2,
              "id": "fernando",
              "match": {
                "fernando": 0.9375,
                "transfer": 0.8125,
              },
              "matching": 2,
              "score": 2.875,
              "total": 1.75,
            },
            {
              "domain": 11,
              "id": "banco",
              "match": {
                "fernando": 0.9375,
                "transfer": 0.8125,
              },
              "matching": 2,
              "score": 2.159090909090909,
              "total": 1.75,
            },
            {
              "domain": 2,
              "id": "chocolate",
              "match": {
                "transfer": 0.8125,
              },
              "matching": 1,
              "score": 1.40625,
              "total": 0.8125,
            },
            {
              "domain": 2,
              "id": "lua",
              "match": {
                "transfer": 0.8125,
              },
              "matching": 1,
              "score": 1.40625,
              "total": 0.8125,
            },
          ],
        }
      `);
		});

		it("transfer to chocolate", () => {
			expect(
				queryTokenMatchScoreMap(["transfer", "to", "chocolate"]),
			).toMatchInlineSnapshot(`
        {
          "query": [
            "transfer",
            "to",
            "chocolate",
          ],
          "result": [
            {
              "domain": 2,
              "id": "chocolate",
              "match": {
                "chocolate": 0.9375,
                "transfer": 0.8125,
              },
              "matching": 2,
              "score": 2.875,
              "total": 1.75,
            },
            {
              "domain": 11,
              "id": "banco",
              "match": {
                "chocolate": 0.9375,
                "transfer": 0.8125,
              },
              "matching": 2,
              "score": 2.159090909090909,
              "total": 1.75,
            },
            {
              "domain": 2,
              "id": "fernando",
              "match": {
                "transfer": 0.8125,
              },
              "matching": 1,
              "score": 1.40625,
              "total": 0.8125,
            },
            {
              "domain": 2,
              "id": "lua",
              "match": {
                "transfer": 0.8125,
              },
              "matching": 1,
              "score": 1.40625,
              "total": 0.8125,
            },
          ],
        }
      `);
		});

		it("market", () => {
			expect(queryTokenMatchScoreMap(["market"])).toMatchInlineSnapshot(`
        {
          "query": [
            "market",
          ],
          "result": [
            {
              "domain": 3,
              "id": "market_dolly",
              "match": {
                "market": 0.875,
              },
              "matching": 1,
              "score": 1.2916666666666667,
              "total": 0.875,
            },
            {
              "domain": 3,
              "id": "market_super",
              "match": {
                "market": 0.875,
              },
              "matching": 1,
              "score": 1.2916666666666667,
              "total": 0.875,
            },
            {
              "domain": 11,
              "id": "banco",
              "match": {
                "market": 0.875,
              },
              "matching": 1,
              "score": 1.0795454545454546,
              "total": 0.875,
            },
          ],
        }
      `);
		});

		it("salary", () => {
			expect(queryTokenMatchScoreMap(["salary"])).toMatchInlineSnapshot(`
        {
          "query": [
            "salary",
          ],
          "result": [
            {
              "domain": 3,
              "id": "xyz_company",
              "match": {
                "salary": 0.9375,
              },
              "matching": 1,
              "score": 1.3125,
              "total": 0.9375,
            },
            {
              "domain": 11,
              "id": "banco",
              "match": {
                "salary": 0.9375,
              },
              "matching": 1,
              "score": 1.0852272727272727,
              "total": 0.9375,
            },
          ],
        }
      `);
		});
	});
});
