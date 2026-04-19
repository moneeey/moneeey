import {
	TABLE_DENSITY_BREAKPOINT,
	TABLE_DENSITY_CHANGE_EVENT,
	TABLE_DENSITY_STORAGE_KEY,
	getTableDensityMode,
	resolveTableDensity,
	setTableDensityMode,
} from "./useTableDensity";

class FakeCustomEvent {
	type: string;
	constructor(type: string) {
		this.type = type;
	}
}

describe("useTableDensity", () => {
	describe("resolveTableDensity", () => {
		it("returns compact when mode is compact regardless of width", () => {
			expect(resolveTableDensity("compact", 2000)).toBe("compact");
			expect(resolveTableDensity("compact", 100)).toBe("compact");
		});

		it("returns full when mode is full regardless of width", () => {
			expect(resolveTableDensity("full", 2000)).toBe("full");
			expect(resolveTableDensity("full", 100)).toBe("full");
		});

		it("auto-resolves based on breakpoint", () => {
			expect(resolveTableDensity("auto", TABLE_DENSITY_BREAKPOINT - 1)).toBe(
				"compact",
			);
			expect(resolveTableDensity("auto", TABLE_DENSITY_BREAKPOINT)).toBe(
				"full",
			);
			expect(resolveTableDensity("auto", TABLE_DENSITY_BREAKPOINT + 100)).toBe(
				"full",
			);
		});
	});

	describe("getTableDensityMode / setTableDensityMode", () => {
		const mockLocalStorage = {
			getItem: jest.fn(),
			setItem: jest.fn(),
		};
		const dispatchEvent = jest.fn();

		beforeEach(() => {
			(globalThis as Record<string, unknown>).window = {
				localStorage: mockLocalStorage,
				sessionStorage: { getItem: jest.fn(), setItem: jest.fn() },
				dispatchEvent,
				CustomEvent: FakeCustomEvent,
			};
			jest.clearAllMocks();
		});

		it("returns 'auto' when nothing is stored", () => {
			mockLocalStorage.getItem.mockReturnValueOnce(null);
			expect(getTableDensityMode()).toBe("auto");
		});

		it("returns stored mode when valid", () => {
			mockLocalStorage.getItem.mockReturnValueOnce("compact");
			expect(getTableDensityMode()).toBe("compact");
			mockLocalStorage.getItem.mockReturnValueOnce("full");
			expect(getTableDensityMode()).toBe("full");
		});

		it("falls back to 'auto' when stored value is invalid", () => {
			mockLocalStorage.getItem.mockReturnValueOnce("something-else");
			expect(getTableDensityMode()).toBe("auto");
		});

		it("persists to localStorage under the expected key", () => {
			setTableDensityMode("compact");
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				TABLE_DENSITY_STORAGE_KEY,
				"compact",
			);
		});

		it("dispatches a custom event so other mounted hooks refresh", () => {
			setTableDensityMode("full");
			expect(dispatchEvent).toHaveBeenCalledTimes(1);
			const event = dispatchEvent.mock.calls[0][0] as FakeCustomEvent;
			expect(event.type).toBe(TABLE_DENSITY_CHANGE_EVENT);
		});
	});
});
