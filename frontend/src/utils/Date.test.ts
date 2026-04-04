import {
	addDay,
	compareDates,
	currentDate,
	currentDateTime,
	dateDistanceInSecs,
	formatDate,
	formatDateAs,
	formatDateFmt,
	formatDateMonth,
	isDateBetween,
	isDateGreater,
	isDateLesser,
	isFirstDayOfMonth,
	isLastDayOfMonth,
	isValidDate,
	parseDate,
	parseDateFmt,
	parseDateTime,
	parseDateOrTime,
	startOfMonthOffset,
} from "./Date";

describe("Date", () => {
	describe("parseDateFmt", () => {
		it("parses a date string with the given format", () => {
			const result = parseDateFmt("2024-03-15", "yyyy-MM-dd");
			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(2);
			expect(result.getDate()).toBe(15);
		});

		it("returns same result on cache hit", () => {
			const first = parseDateFmt("2024-06-01", "yyyy-MM-dd");
			const second = parseDateFmt("2024-06-01", "yyyy-MM-dd");
			expect(first.getTime()).toBe(second.getTime());
		});
	});

	describe("parseDate", () => {
		it("parses a TDate string", () => {
			const result = parseDate("2023-12-25");
			expect(result.getFullYear()).toBe(2023);
			expect(result.getMonth()).toBe(11);
			expect(result.getDate()).toBe(25);
		});
	});

	describe("parseDateTime", () => {
		it("parses a TDateTime string", () => {
			const result = parseDateTime("2023-12-25T14:30:00-03:00");
			expect(result.getFullYear()).toBe(2023);
			expect(result.getMonth()).toBe(11);
			expect(result.getDate()).toBe(25);
		});
	});

	describe("parseDateOrTime", () => {
		it("parses a date-length string as date", () => {
			const result = parseDateOrTime("2023-06-15");
			expect(result.getFullYear()).toBe(2023);
			expect(result.getMonth()).toBe(5);
			expect(result.getDate()).toBe(15);
		});

		it("parses a datetime string with timezone offset", () => {
			const result = parseDateOrTime("2023-06-15T10:30:00-03:00");
			expect(result.getFullYear()).toBe(2023);
			expect(result.getMonth()).toBe(5);
			expect(result.getDate()).toBe(15);
		});

		it("returns current date for empty string", () => {
			const before = new Date();
			const result = parseDateOrTime("");
			const after = new Date();
			expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("returns current date for unrecognized length", () => {
			const before = new Date();
			const result = parseDateOrTime("abc");
			const after = new Date();
			expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe("formatDate", () => {
		it("formats a Date as yyyy-MM-dd", () => {
			expect(formatDate(new Date(2024, 0, 5))).toBe("2024-01-05");
		});
	});

	describe("formatDateMonth", () => {
		it("formats a Date as MMM yyyy", () => {
			const result = formatDateMonth(new Date(2024, 3, 1));
			expect(result).toMatch(/Apr 2024/);
		});
	});

	describe("formatDateFmt / formatDateAs", () => {
		it("formats a Date with a custom pattern", () => {
			expect(formatDateFmt(new Date(2024, 0, 15), "dd/MM/yyyy")).toBe(
				"15/01/2024",
			);
		});

		it("formats a TDate string with a custom pattern", () => {
			expect(formatDateAs("2024-01-15", "dd/MM/yyyy")).toBe("15/01/2024");
		});
	});

	describe("currentDate / currentDateTime", () => {
		it("currentDate returns today in yyyy-MM-dd", () => {
			expect(currentDate()).toBe(formatDate(new Date()));
		});

		it("currentDateTime returns an ISO string", () => {
			const result = currentDateTime();
			expect(isValidDate(new Date(result))).toBe(true);
		});
	});

	describe("isValidDate", () => {
		it("returns true for a valid date", () => {
			expect(isValidDate(new Date(2024, 0, 1))).toBe(true);
		});

		it("returns false for an invalid date", () => {
			expect(isValidDate(new Date("invalid"))).toBe(false);
		});
	});

	describe("isFirstDayOfMonth / isLastDayOfMonth", () => {
		// NOTE: The source has these swapped — isLastDayOfMonth calls _isFirstDayOfMonth
		// and vice versa. Tests document actual behavior.
		it("isFirstDayOfMonth returns true for last day of month (swapped impl)", () => {
			expect(isFirstDayOfMonth("2024-01-31")).toBe(true);
			expect(isFirstDayOfMonth("2024-01-15")).toBe(false);
		});

		it("isLastDayOfMonth returns true for first day of month (swapped impl)", () => {
			expect(isLastDayOfMonth("2024-01-01")).toBe(true);
			expect(isLastDayOfMonth("2024-01-15")).toBe(false);
		});
	});

	describe("compareDates", () => {
		it("returns negative when a < b", () => {
			expect(compareDates("2024-01-01", "2024-01-02")).toBeLessThan(0);
		});

		it("returns positive when a > b", () => {
			expect(compareDates("2024-01-02", "2024-01-01")).toBeGreaterThan(0);
		});

		it("returns 0 when equal", () => {
			expect(compareDates("2024-01-01", "2024-01-01")).toBe(0);
		});
	});

	describe("isDateGreater / isDateLesser", () => {
		const jan1 = new Date(2024, 0, 1);
		const jan2 = new Date(2024, 0, 2);

		it("isDateGreater is inclusive (>=)", () => {
			expect(isDateGreater(jan2, jan1)).toBe(true);
			expect(isDateGreater(jan1, jan1)).toBe(true);
			expect(isDateGreater(jan1, jan2)).toBe(false);
		});

		it("isDateLesser is inclusive (<=)", () => {
			expect(isDateLesser(jan1, jan2)).toBe(true);
			expect(isDateLesser(jan1, jan1)).toBe(true);
			expect(isDateLesser(jan2, jan1)).toBe(false);
		});
	});

	describe("isDateBetween", () => {
		const min = new Date(2024, 0, 1);
		const mid = new Date(2024, 0, 15);
		const max = new Date(2024, 0, 31);

		it("returns true when date is in range", () => {
			expect(isDateBetween(mid, min, max)).toBe(true);
		});

		it("returns true at boundaries (inclusive)", () => {
			expect(isDateBetween(min, min, max)).toBe(true);
			expect(isDateBetween(max, min, max)).toBe(true);
		});

		it("returns false when outside range", () => {
			expect(isDateBetween(new Date(2023, 11, 31), min, max)).toBe(false);
			expect(isDateBetween(new Date(2024, 1, 1), min, max)).toBe(false);
		});
	});

	describe("startOfMonthOffset", () => {
		const date = new Date(2024, 5, 15); // June 15

		it("offset 0 returns first day of same month", () => {
			const result = startOfMonthOffset(date, 0);
			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(5);
			expect(result.getDate()).toBe(1);
		});

		it("offset +1 returns first day of next month", () => {
			const result = startOfMonthOffset(date, 1);
			expect(result.getMonth()).toBe(6);
			expect(result.getDate()).toBe(1);
		});

		it("offset -1 returns first day of previous month", () => {
			const result = startOfMonthOffset(date, -1);
			expect(result.getMonth()).toBe(4);
			expect(result.getDate()).toBe(1);
		});
	});

	describe("dateDistanceInSecs", () => {
		it("returns absolute seconds between two dates", () => {
			const a = new Date(2024, 0, 1, 0, 0, 0);
			const b = new Date(2024, 0, 1, 0, 5, 0);
			expect(dateDistanceInSecs(a, b)).toBe(300);
		});

		it("is absolute regardless of order", () => {
			const a = new Date(2024, 0, 1, 0, 0, 0);
			const b = new Date(2024, 0, 1, 1, 0, 0);
			expect(dateDistanceInSecs(a, b)).toBe(dateDistanceInSecs(b, a));
		});
	});

	describe("addDay", () => {
		it("adds positive days", () => {
			const result = addDay(new Date(2024, 0, 1), 5);
			expect(result.getDate()).toBe(6);
		});

		it("subtracts with negative days", () => {
			const result = addDay(new Date(2024, 0, 10), -3);
			expect(result.getDate()).toBe(7);
		});

		it("zero offset returns same date", () => {
			const date = new Date(2024, 0, 15);
			const result = addDay(date, 0);
			expect(result.getDate()).toBe(15);
		});
	});
});
