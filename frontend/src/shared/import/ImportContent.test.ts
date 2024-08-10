import { findMostCommonDateFormat, retrieveLineColumns } from "./ImportContent";

describe("ImportContent", () => {
	const findCommonDateFormat = (lines: string) => {
		const { dateFormat, pattern } =
			findMostCommonDateFormat(lines.split("\n")) || {};
		return { dateFormat, pattern: String(pattern) };
	};
	it("findMostCommonDateFormat yyyy-MM-dd", () =>
		expect(
			findCommonDateFormat(`
Date,Amount,Description
2024-08-10,5.75,Coffee Shop
2024-08-09,-1,200.00,Rent`),
		).toEqual({
			dateFormat: "yyyy-MM-dd",
			pattern: String(/\b\d\d\d\d-\d\d-\d\d\b/),
		}));

	it("findMostCommonDateFormat yyyy/MM/dd", () =>
		expect(
			findCommonDateFormat(`
Date;Amount;Description
2024/07/31;200.00;Savings
2024/08/05;-75.50;Utilities
`),
		).toEqual({
			dateFormat: "yyyy/MM/dd",
			pattern: String(/\b\d\d\d\d\/\d\d\/\d\d\b/),
		}));

	it("findMostCommonDateFormat MMM dd", () =>
		expect(
			findCommonDateFormat(`
Date;Amount;Description
Aug 22;200.00;Savings
Sep 13;-75.50;Utilities
`),
		).toEqual({
			dateFormat: "MMM dd",
			pattern: String(/\b[A-Za-z][A-Za-z][A-Za-z] \d\d\b/),
		}));

	const testRetrieveLineColumns = ([
		expectedDate,
		expectedAmount,
		expectedOther,
		line,
	]: string[]) => {
		const foundDateFormat = findMostCommonDateFormat([line]);
		if (!foundDateFormat) throw new Error("foundDateFormat undefined");
		expect(retrieveLineColumns(line, foundDateFormat?.dateFormat)).toEqual({
			date: expectedDate,
			other: expectedOther,
			value: Number.parseFloat(expectedAmount),
		});
	};

	it("retrieveLineColumns basic", () =>
		testRetrieveLineColumns([
			"2024-08-10",
			"5.75",
			"Coffee Shop",
			"2024-08-10 | Coffee Shop | $5.75",
		]));

	it("retrieveLineColumns negative amount", () =>
		testRetrieveLineColumns([
			"2024-08-08",
			"-1200.0",
			"Rent",
			"08/08/2024 > Rent > -1,200.00",
		]));

	it("retrieveLineColumns negative amount after $", () =>
		testRetrieveLineColumns([
			"2024-07-31",
			"-75.5",
			"Utilities",
			"2024/07/31 | Utilities || $-75.50",
		]));

	it("retrieveLineColumns different date and thousand separator", () =>
		testRetrieveLineColumns([
			"2024-03-07",
			"3500.0",
			"Salary",
			"07.03.2024 - Salary : +3,500.00",
		]));

	it("retrieveLineColumns another date format", () =>
		testRetrieveLineColumns([
			"2024-07-31",
			"-500.25",
			"Insurance",
			"31-Jul-2024 | Insurance || -500.25",
		]));

	it("retrieveLineColumns yet another date format", () =>
		testRetrieveLineColumns([
			"2024-08-07",
			"15000.0",
			"Investment",
			"20240807 || Investment > +15,000.00",
		]));

	it("retrieveLineColumns big number", () =>
		testRetrieveLineColumns([
			"2024-08-10",
			"87645000.759",
			"Bonus",
			"2024-08-10 : Bonus || $87.645.000,759",
		]));

	it("retrieveLineColumns huge negative number with many decimals", () =>
		testRetrieveLineColumns([
			"2024-08-09",
			"-550000.1234567",
			"Loan Repayment",
			"08-09-2024 > Loan Repayment || $-550.000,1234567",
		]));

	it("retrieveLineColumns spaces in the number", () =>
		testRetrieveLineColumns([
			"2024-07-14",
			"-1200000.0",
			"Rent",
			"Rent > -1 200 000.00 | 07/14/24",
		]));
});
