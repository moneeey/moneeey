import {
	PRIVACY_MODE_CHANGE_EVENT,
	PRIVACY_MODE_STORAGE_KEY,
	getPrivacyMode,
	setPrivacyMode,
	togglePrivacyMode,
} from "./usePrivacyMode";

class FakeCustomEvent {
	type: string;
	constructor(type: string) {
		this.type = type;
	}
}

describe("usePrivacyMode", () => {
	const mockLocalStorage = {
		getItem: jest.fn(),
		setItem: jest.fn(),
	};
	const dispatchEvent = jest.fn();
	const setAttribute = jest.fn();
	const removeAttribute = jest.fn();

	beforeEach(() => {
		(globalThis as Record<string, unknown>).window = {
			localStorage: mockLocalStorage,
			sessionStorage: { getItem: jest.fn(), setItem: jest.fn() },
			dispatchEvent,
			CustomEvent: FakeCustomEvent,
		};
		(globalThis as Record<string, unknown>).document = {
			documentElement: {
				setAttribute,
				removeAttribute,
			},
		};
		jest.clearAllMocks();
	});

	it("returns false when nothing is stored", () => {
		mockLocalStorage.getItem.mockReturnValueOnce(null);
		expect(getPrivacyMode()).toBe(false);
	});

	it("returns true when 'true' is stored", () => {
		mockLocalStorage.getItem.mockReturnValueOnce("true");
		expect(getPrivacyMode()).toBe(true);
	});

	it("persists to localStorage when setting privacy mode", () => {
		setPrivacyMode(true);
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
			PRIVACY_MODE_STORAGE_KEY,
			"true",
		);
		expect(setAttribute).toHaveBeenCalledWith("data-privacy-mode", "true");
		expect(dispatchEvent).toHaveBeenCalledTimes(1);
		const event = dispatchEvent.mock.calls[0][0] as FakeCustomEvent;
		expect(event.type).toBe(PRIVACY_MODE_CHANGE_EVENT);
	});

	it("removes document attribute when disabled", () => {
		setPrivacyMode(false);
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
			PRIVACY_MODE_STORAGE_KEY,
			"false",
		);
		expect(removeAttribute).toHaveBeenCalledWith("data-privacy-mode");
	});

	it("toggles privacy mode correctly", () => {
		mockLocalStorage.getItem.mockReturnValueOnce("false");
		const res1 = togglePrivacyMode();
		expect(res1).toBe(true);
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
			PRIVACY_MODE_STORAGE_KEY,
			"true",
		);

		mockLocalStorage.getItem.mockReturnValueOnce("true");
		const res2 = togglePrivacyMode();
		expect(res2).toBe(false);
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
			PRIVACY_MODE_STORAGE_KEY,
			"false",
		);
	});
});
