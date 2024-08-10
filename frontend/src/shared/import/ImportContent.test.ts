import { MostCommonDateFormats, formatDateFmt } from "../../utils/Date";
import { findMostCommonDateFormat, retrieveLineColumns } from "./ImportContent";

describe("ImportContent", () => {
	it("MostCommonDateFormats", () =>
		expect(
  MostCommonDateFormats.map((pattern) => {
    const date = new Date(Date.UTC(2024, 11, 29, 22, 33, 44, 567));
    console.log(date.getTimezoneOffset());
    return `${pattern} -> ${formatDateFmt(date, pattern)}`;
  })
).toMatchInlineSnapshot(`
[
  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z' -> 2024-12-29T19:33:44.567Z",
  "yyyy-MM-dd HH:mm:ss.SSS'Z' -> 2024-12-29 19:33:44.567Z",
  "yyyy-MM-dd'T'HH:mm:ss.SSS -> 2024-12-29T19:33:44.567",
  "yyyy-MM-dd'T'HH:mm:ss.SSS -> 2024-12-29T19:33:44.567",
  "yyyy-MM-dd'T'HH:mm:ss.SSSS -> 2024-12-29T19:33:44.5670",
  "yyyy-MM-dd HH:mm:ss.SSSS -> 2024-12-29 19:33:44.5670",
  "yyyy-MM-dd'T'HH:mm:ss'Z' -> 2024-12-29T19:33:44Z",
  "yyyy-MM-dd HH:mm:ss.S'Z' -> 2024-12-29 19:33:44.5Z",
  "yyyy-MM-dd'T'HH:mm:ss.SSS -> 2024-12-29T19:33:44.567",
  "yyyy-MM-dd HH:mm:ss.SSS -> 2024-12-29 19:33:44.567",
  "yyyyMMdd'T'HHmm'Z'.SSS'Z' -> 20241229T1933Z.567Z",
  "yyyy-MM-dd'T'HH:mm:ss.S -> 2024-12-29T19:33:44.5",
  "yyyy-MM-dd'T'HH:mm:ss'Z' -> 2024-12-29T19:33:44Z",
  "yyyy-MM-dd'T'HH:mm:ss.SS -> 2024-12-29T19:33:44.56",
  "yyyy-MM-dd'T'HH:mm:ss'Z' -> 2024-12-29T19:33:44Z",
  "yyyy-MM-dd'T'HH:mm:ss'Z' -> 2024-12-29T19:33:44Z",
  "yyyy-MM-dd HH:mm:ss.SS -> 2024-12-29 19:33:44.56",
  "yyyy-MM-dd HH:mm:ss.SS -> 2024-12-29 19:33:44.56",
  "yyyy-MM-dd HH:mm:ss.S -> 2024-12-29 19:33:44.5",
  "yyyyMMdd'T'HHmmss.SS'Z' -> 20241229T193344.56Z",
  "yyyy-MM-dd'T'HH:mm:ss.s -> 2024-12-29T19:33:44.44",
  "yyyyMMdd'T'HHmmss.SS'Z' -> 20241229T193344.56Z",
  "yyyy-MM-dd HH:mm:ss.S -> 2024-12-29 19:33:44.5",
  "yyyyMMdd'T'HHmmss'Z'.S -> 20241229T193344Z.5",
  "dd-MMM-yyyy HH:mm:ss -> 29-Dec-2024 19:33:44",
  "yyyyMMdd'T'HHmmss.S'Z' -> 20241229T193344.5Z",
  "yyyy-MM-dd'T'HH:mm:ss -> 2024-12-29T19:33:44",
  "yyyy-MM-dd'T'HH:mm:ss -> 2024-12-29T19:33:44",
  "yyyy.MM.dd HH:mm:ss -> 2024.12.29 19:33:44",
  "dd/MM/yyyy HH:mm:ss -> 29/12/2024 19:33:44",
  "MM/dd/yyyy HH:mm:ss -> 12/29/2024 19:33:44",
  "yyyy-MM-dd HH:mm:ss -> 2024-12-29 19:33:44",
  "yyyy-MM-dd'T'HH:mm:ss -> 2024-12-29T19:33:44",
  "yyyyMMdd'T'HHmm'Z'.SS -> 20241229T1933Z.56",
  "dd.MM.yyyy HH:mm:ss -> 29.12.2024 19:33:44",
  "yyyyMMdd'T'HHmmSSS.SS -> 20241229T1933567.56",
  "dd/MM/yyyy HH'h'mm -> 29/12/2024 19h33",
  "MM/dd/yyyy HH'h'mm -> 12/29/2024 19h33",
  "yyyy-MM-dd HH'h'mm -> 2024-12-29 19h33",
  "yyyy/MM/dd HH'h'mm -> 2024/12/29 19h33",
  "dd.MM.yyyy HH'h'mm -> 29.12.2024 19h33",
  "yyyyMMdd'T'HHmmss'Z' -> 20241229T193344Z",
  "yyyyMMdd'T'HHmmss'Z' -> 20241229T193344Z",
  "yyyyMMdd'T'HHmmss'Z' -> 20241229T193344Z",
  "yyyyMMdd'T'HHmmss.SS -> 20241229T193344.56",
  "yyyyMMdd'T'HHmmss.SS -> 20241229T193344.56",
  "yyyyMMdd'T'HHmmss.S -> 20241229T193344.5",
  "yy/MM/dd HH:mm:ss -> 24/12/29 19:33:44",
  "yyyyMMddHHmmss.SS -> 20241229193344.56",
  "dd/MM/yyyy HH:mm -> 29/12/2024 19:33",
  "MM/dd/yyyy HH:mm -> 12/29/2024 19:33",
  "yyyy-MM-dd HH:mm -> 2024-12-29 19:33",
  "yyyy/MM/dd HH:mm -> 2024/12/29 19:33",
  "dd.MM.yyyy HH:mm -> 29.12.2024 19:33",
  "yyyyMMdd'T'HHmm'Z' -> 20241229T1933Z",
  "yyyyMMdd'T'HHmm'Z' -> 20241229T1933Z",
  "yyyy-MM-dd HH:mm -> 2024-12-29 19:33",
  "yyyyMMdd'T'HHmm'Z' -> 20241229T1933Z",
  "yyyyMMdd'T'HHmmSSS -> 20241229T1933567",
  "yyyyMMddHHmmSSS -> 202412291933567",
  "yyyyMMdd'T'HHmmSS -> 20241229T193356",
  "yyyyMMdd'T'HHmmSS -> 20241229T193356",
  "yyyyMMddHHmmSSS -> 202412291933567",
  "yyyyMMdd'T'HHmmSS -> 20241229T193356",
  "MMMM dd, yyyy -> December 29, 2024",
  "Do MMMM, yyyy -> 364th December, 2024",
  "yyyyMMdd'T'HHmm -> 20241229T1933",
  "dd MMMM yyyy -> 29 December 2024",
  "MMM dd, yyyy -> Dec 29, 2024",
  "Do MMMM yyyy -> 364th December 2024",
  "dd MMM yyyy -> 29 Dec 2024",
  "MMMM dd, yy -> December 29, 24",
  "yyyy/MMM/dd -> 2024/Dec/29",
  "MMM/dd/yyyy -> Dec/29/2024",
  "yyyy-MMM-dd -> 2024-Dec-29",
  "MMM-dd-yyyy -> Dec-29-2024",
  "dd-MMM-yyyy -> 29-Dec-2024",
  "MMM dd yyyy -> Dec 29 2024",
  "dd-MMM-yyyy -> 29-Dec-2024",
  "yyyy-MM-dd -> 2024-12-29",
  "MM/dd/yyyy -> 12/29/2024",
  "dd/MM/yyyy -> 29/12/2024",
  "yyyy/MM/dd -> 2024/12/29",
  "MM-dd-yyyy -> 12-29-2024",
  "dd-MM-yyyy -> 29-12-2024",
  "yyyy.MM.dd -> 2024.12.29",
  "dd.MM.yyyy -> 29.12.2024",
  "MM.dd.yyyy -> 12.29.2024",
  "dd MMMM yy -> 29 December 24",
  "MMM dd, yy -> Dec 29, 24",
  "MMMMddyyyy -> December292024",
  "dd.MM.yyyy -> 29.12.2024",
  "yyyy.MM.dd -> 2024.12.29",
  "dd MMM yy -> 29 Dec 24",
  "ddMMMyyyy -> 29Dec2024",
  "yyyyMMdd -> 20241229",
  "MM/dd/yy -> 12/29/24",
  "dd/MM/yy -> 29/12/24",
  "yy-MM-dd -> 24-12-29",
  "yy/MM/dd -> 24/12/29",
  "MM-dd-yy -> 12-29-24",
  "dd-MM-yy -> 29-12-24",
  "yyyyddd -> 2024029",
  "dd MMM -> 29 Dec",
  "MMM dd -> Dec 29",
  "yyddd -> 24029",
]
`));

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

	it("findMostCommonDateFormat dd/MM/yyyy HH'h'MM", () =>
		expect(
			findCommonDateFormat(`
Date
13/10/2023 23h59
13/10/2023 07h21
`),
		).toEqual({
			dateFormat: "dd/MM/yyyy HH'h'mm",
			pattern: String(/\b\d\d\/\d\d\/\d\d\d\d \d\d[A-Za-z]\d\d\b/),
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

	it("retrieveLineColumns huge number at start", () =>
		testRetrieveLineColumns([
			"2022-01-10",
			"-76214.74",
			"Transferencia recebida",
			"-76214.74  Transferencia recebida  2022-01-10",
		]));

	it("retrieveLineColumns huge number at start comma decimal separator", () =>
		testRetrieveLineColumns([
			"2022-01-10",
			"-76214.74",
			"Transferencia recebida",
			"-76214,74  Transferencia recebida  2022-01-10",
		]));

	it("retrieveLineColumns number in other, amount in suffix", () =>
		testRetrieveLineColumns([
			"2024-08-10",
			"5.75",
			"51 Coffee 42 Shop 68",
			"2024-08-10 | 51 Coffee 42 Shop 68 | $5.75",
		]));

	it("retrieveLineColumns number in other, amount in prefix", () =>
		testRetrieveLineColumns([
			"2024-08-10",
			"7.25",
			"51 Coffee 42 Shop 68",
			"7.25 | 2024-08-10 | 51 Coffee 42 Shop 68",
		]));
});
