import { ITransaction, mockTransaction } from "../entities/Transaction";

import { addDay, currentDate, formatDate, parseDate } from "./Date";
import RunningBalance from "./RunningBalance";

describe("RunningBalance", () => {
	const dateOffset = (offset: number) =>
		formatDate(addDay(parseDate(currentDate()), offset));

	const testRunningBalances = async function (
		transactions: ITransaction[],
		expected: Map<string, { from_balance: number; to_balance: number }>,
	) {
		const r = new RunningBalance();
		await r.processAll(transactions);
		expect(new Map(r.transactionRunningBalance)).toEqual(expected);
	};

	it("zero transaction", async () => {
		await testRunningBalances([], new Map([]));
	});

	it("single transaction", async () => {
		await testRunningBalances(
			[
				mockTransaction({
					date: dateOffset(-2),
					transaction_uuid: "t-single",
					from_account: "banco",
					to_account: "market_super",
					from_value: 300,
				}),
			],
			new Map([["t-single", { from_balance: -300, to_balance: 300 }]]),
		);
	});

	it("two transactions, different dates", async () => {
		await testRunningBalances(
			[
				mockTransaction({
					date: dateOffset(-2),
					transaction_uuid: "t-two-1",
					from_account: "banco",
					to_account: "market_super",
					from_value: 300,
				}),
				mockTransaction({
					date: dateOffset(-1),
					transaction_uuid: "t-two-2",
					from_account: "banco",
					to_account: "market_super",
					from_value: 500,
				}),
			],
			new Map([
				["t-two-1", { from_balance: -300, to_balance: 300 }],
				["t-two-2", { from_balance: -800, to_balance: 800 }],
			]),
		);
	});

	it("four transactions, sharing dates", async () => {
		await testRunningBalances(
			[
				mockTransaction({
					date: dateOffset(-2),
					transaction_uuid: "t-four-1",
					from_account: "banco",
					to_account: "market_super",
					from_value: 200,
				}),
				mockTransaction({
					date: dateOffset(-2),
					transaction_uuid: "t-four-2",
					from_account: "banco",
					to_account: "market_super",
					from_value: 300,
				}),
				mockTransaction({
					date: dateOffset(-1),
					transaction_uuid: "t-four-3",
					from_account: "banco",
					to_account: "market_super",
					from_value: 1000,
				}),
				mockTransaction({
					date: dateOffset(-1),
					transaction_uuid: "t-four-4",
					from_account: "banco",
					to_account: "market_super",
					from_value: 2000,
				}),
			],
			new Map([
				["t-four-1", { from_balance: -200, to_balance: 200 }],
				["t-four-2", { from_balance: -500, to_balance: 500 }],
				["t-four-3", { from_balance: -1500, to_balance: 1500 }],
				["t-four-4", { from_balance: -3500, to_balance: 3500 }],
			]),
		);
	});

	it("three transactions, different accounts", async () => {
		await testRunningBalances(
			[
				mockTransaction({
					date: dateOffset(-2),
					transaction_uuid: "t-three-1",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 200,
				}),
				mockTransaction({
					date: dateOffset(-2),
					transaction_uuid: "t-three-2",
					from_account: "accountB",
					to_account: "accountE",
					from_value: 300,
				}),
				mockTransaction({
					date: dateOffset(-1),
					transaction_uuid: "t-three-3",
					from_account: "accountC",
					to_account: "accountF",
					from_value: 400,
				}),
			],
			new Map([
				["t-three-1", { from_balance: -200, to_balance: 200 }],
				["t-three-2", { from_balance: -300, to_balance: 300 }],
				["t-three-3", { from_balance: -400, to_balance: 400 }],
			]),
		);
	});

	it("multiple transactions, multiple accounts and multiple dates with gaps", async () => {
		await testRunningBalances(
			[
				mockTransaction({
					date: dateOffset(-20),
					transaction_uuid: "t-multi-1",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 200,
				}),
				mockTransaction({
					date: dateOffset(-20),
					transaction_uuid: "t-multi-2",
					from_account: "accountB",
					to_account: "accountE",
					from_value: 300,
				}),
				mockTransaction({
					date: dateOffset(-15),
					transaction_uuid: "t-multi-3",
					from_account: "accountC",
					to_account: "accountF",
					from_value: 400,
				}),
				mockTransaction({
					date: dateOffset(-15),
					transaction_uuid: "t-multi-4",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 600,
				}),
				mockTransaction({
					date: dateOffset(-10),
					transaction_uuid: "t-multi-5",
					from_account: "accountE",
					to_account: "accountB",
					from_value: 700,
				}),
				mockTransaction({
					date: dateOffset(-10),
					transaction_uuid: "t-multi-6",
					from_account: "accountC",
					to_account: "accountF",
					from_value: 800,
				}),
				mockTransaction({
					date: dateOffset(-10),
					transaction_uuid: "t-multi-7",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 900,
				}),
				mockTransaction({
					date: dateOffset(-10),
					transaction_uuid: "t-multi-8",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 1000,
				}),
				mockTransaction({
					date: dateOffset(-10),
					transaction_uuid: "t-multi-9",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 1100,
				}),
				mockTransaction({
					date: dateOffset(-5),
					transaction_uuid: "t-multi-10",
					from_account: "accountA",
					to_account: "accountD",
					from_value: 10000,
				}),
			],
			new Map([
				["t-multi-1", { from_balance: -200, to_balance: 200 }],
				["t-multi-2", { from_balance: -300, to_balance: 300 }],
				["t-multi-3", { from_balance: -400, to_balance: 400 }],
				["t-multi-4", { from_balance: -800, to_balance: 800 }],
				["t-multi-5", { from_balance: -400, to_balance: 400 }],
				["t-multi-6", { from_balance: -1200, to_balance: 1200 }],
				["t-multi-7", { from_balance: -1700, to_balance: 1700 }],
				["t-multi-8", { from_balance: -2700, to_balance: 2700 }],
				["t-multi-9", { from_balance: -3800, to_balance: 3800 }],
				["t-multi-10", { from_balance: -13800, to_balance: 13800 }],
			]),
		);
	});
});
