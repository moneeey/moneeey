import {
	StorageKind,
	asyncProcess,
	asyncSleep,
	asyncTimeout,
	capitalize,
	getCurrentHost,
	getStorage,
	identity,
	noop,
	setStorage,
	shingle,
	slugify,
	uuid,
} from "./Utils";

describe("Utils", () => {
	describe("uuid", () => {
		it("returns a string", () => {
			expect(typeof uuid()).toBe("string");
		});

		it("returns unique values", () => {
			expect(uuid()).not.toBe(uuid());
		});
	});

	describe("noop", () => {
		it("returns undefined", () => {
			expect(noop()).toBeUndefined();
		});
	});

	describe("identity", () => {
		it("returns the same value", () => {
			const obj = { a: 1 };
			expect(identity(obj)).toBe(obj);
			expect(identity(42)).toBe(42);
			expect(identity(null)).toBe(null);
		});
	});

	describe("shingle", () => {
		it("produces 3-char sliding windows from cleaned lowercase text", () => {
			expect(shingle("Hello World")).toEqual([
				"hel",
				"ell",
				"llo",
				"low",
				"owo",
				"wor",
				"orl",
				"rld",
			]);
		});

		it("preserves digits", () => {
			expect(shingle("PIX 8234")).toEqual(["pix", "ix8", "x82", "823", "234"]);
		});

		it("returns short string as single shingle when shorter than n", () => {
			expect(shingle("ab")).toEqual(["ab"]);
			expect(shingle("x")).toEqual(["x"]);
		});

		it("returns empty array for undefined", () => {
			expect(shingle(undefined)).toEqual([]);
		});

		it("returns empty array for empty string", () => {
			expect(shingle("")).toEqual([]);
		});

		it("returns empty array for string with only special chars", () => {
			expect(shingle("!@#$%")).toEqual([]);
		});

		it("supports custom shingle size", () => {
			expect(shingle("abcde", 2)).toEqual(["ab", "bc", "cd", "de"]);
		});
	});

	describe("asyncTimeout", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("resolves with fn return value after delay", async () => {
			const promise = asyncTimeout(() => 42, 100);
			jest.advanceTimersByTime(100);
			await expect(promise).resolves.toBe(42);
		});
	});

	describe("asyncSleep", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("resolves after delay", async () => {
			const promise = asyncSleep(100);
			jest.advanceTimersByTime(100);
			await expect(promise).resolves.toBeUndefined();
		});
	});

	describe("capitalize", () => {
		it("capitalizes first letter", () => {
			expect(capitalize("hello")).toBe("Hello");
		});

		it("leaves already capitalized unchanged", () => {
			expect(capitalize("Hello")).toBe("Hello");
		});

		it("handles single character", () => {
			expect(capitalize("a")).toBe("A");
		});

		it("returns empty string for empty string", () => {
			expect(capitalize("")).toBe("");
		});
	});

	describe("asyncProcess", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("processes all items and returns state", async () => {
			const items = [1, 2, 3, 4, 5];
			const collected: number[] = [];
			const promise = asyncProcess(
				items,
				(chunk, _state) => {
					collected.push(...chunk);
				},
				{ chunkSize: 2, chunkThrottle: 10 },
			);

			// Flush all timers for chunk throttle sleeps
			for (let i = 0; i < 10; i++) {
				await Promise.resolve();
				jest.advanceTimersByTime(10);
			}

			await promise;
			expect(collected).toEqual([1, 2, 3, 4, 5]);
		});

		it("returns default state for empty array", async () => {
			const result = await asyncProcess([], jest.fn());
			expect(result).toEqual({});
		});

		it("returns custom initial state", async () => {
			const state = { count: 0 };
			const result = await asyncProcess(
				[1],
				(_chunk, s: { count: number }) => {
					s.count += 1;
				},
				{ state },
			);
			expect(result.count).toBe(1);
		});

		it("reports percentage progress", async () => {
			const percentages: number[] = [];
			const promise = asyncProcess(
				[1, 2, 3, 4],
				(_chunk, _state, percentage) => {
					percentages.push(percentage);
				},
				{ chunkSize: 2, chunkThrottle: 10 },
			);

			for (let i = 0; i < 10; i++) {
				await Promise.resolve();
				jest.advanceTimersByTime(10);
			}

			await promise;
			expect(percentages[percentages.length - 1]).toBe(100);
		});
	});

	describe("getStorage / setStorage", () => {
		const mockLocalStorage = {
			getItem: jest.fn(),
			setItem: jest.fn(),
		};
		const mockSessionStorage = {
			getItem: jest.fn(),
			setItem: jest.fn(),
		};

		beforeEach(() => {
			(globalThis as Record<string, unknown>).window = {
				localStorage: mockLocalStorage,
				sessionStorage: mockSessionStorage,
			};
			jest.clearAllMocks();
		});

		it("reads from localStorage for PERMANENT", () => {
			mockLocalStorage.getItem.mockReturnValueOnce("saved");
			expect(getStorage("key", "default", StorageKind.PERMANENT)).toBe("saved");
		});

		it("reads from sessionStorage for SESSION", () => {
			mockSessionStorage.getItem.mockReturnValueOnce("session_val");
			expect(getStorage("key", "default", StorageKind.SESSION)).toBe(
				"session_val",
			);
		});

		it("returns default when key not found", () => {
			mockLocalStorage.getItem.mockReturnValueOnce(null);
			expect(getStorage("missing", "fallback", StorageKind.PERMANENT)).toBe(
				"fallback",
			);
		});

		it("writes to localStorage for PERMANENT", () => {
			setStorage("key", "value", StorageKind.PERMANENT);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key", "value");
		});

		it("writes to sessionStorage for SESSION", () => {
			setStorage("key", "value", StorageKind.SESSION);
			expect(mockSessionStorage.setItem).toHaveBeenCalledWith("key", "value");
		});
	});

	describe("getCurrentHost", () => {
		it("returns protocol + host", () => {
			(globalThis as Record<string, unknown>).window = {
				location: { protocol: "https:", host: "example.com" },
			};
			expect(getCurrentHost()).toBe("https://example.com");
		});
	});

	describe("slugify", () => {
		it("converts to lowercase with dashes", () => {
			expect(slugify("Hello World")).toBe("hello-world");
		});

		it("replaces accented characters", () => {
			expect(slugify("café résumé")).toBe("cafe-resume");
		});

		it("replaces & with -and-", () => {
			expect(slugify("salt & pepper")).toBe("salt-and-pepper");
		});

		it("collapses multiple dashes", () => {
			expect(slugify("a -- b")).toBe("a-b");
		});

		it("trims leading and trailing dashes", () => {
			expect(slugify("  hello  ")).toBe("hello");
		});

		it("returns dash unchanged for single dash input", () => {
			expect(slugify("-")).toBe("-");
		});

		it("handles slashes and special separators", () => {
			expect(slugify("a/b_c:d")).toBe("a-b-c-d");
		});
	});
});
