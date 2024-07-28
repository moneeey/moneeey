import type { ICurrency } from "../entities/Currency";

import { EntityType } from "./Entity";
import { MockLogger } from "./Logger";
import PersistenceStore from "./Persistence";

describe("Persistence", () => {
	let persistence: PersistenceStore;
	let mockLogger: MockLogger;

	const yesterday = {
		updated: "2022-10-13T22:00:26-03:00",
		created: "2022-10-13T22:00:26-03:00",
	};

	const today = {
		updated: "2022-10-14T23:00:26-03:00",
		created: "2022-10-14T23:00:26-03:00",
	};

	const rev1 = { _rev: "1-13cc7a98be34fcf6a409b9808b592025" };
	const rev2 = { _rev: "2-13cc7a98be34fcf6a409b9808b592030" };

	const sampleCurrency = (obj: object): ICurrency => ({
		entity_type: EntityType.CURRENCY,
		currency_uuid: "Bitcoin_BTC",
		name: "Bitcoin",
		short: "BTC",
		prefix: "₿",
		suffix: "",
		decimals: 8,
		tags: [],
		_id: "CURRENCY-Bitcoin_BTC",
		...obj,
	});

	beforeEach(() => {
		mockLogger = new MockLogger("tests");
		persistence = new PersistenceStore(
			() => ({}) as PouchDB.Database,
			mockLogger,
		);
		jest.spyOn(persistence, "commit").mockReturnValue();
	});

	const thenExpect = ({
		updated,
		outdated,
		resolved,
	}: { updated: object; outdated: object; resolved: object }) => {
		const state = {
			log: mockLogger.calls,
			commit: (persistence.commit as jest.Mock<unknown, unknown[]>).mock.calls,
		};
		expect(state).toEqual({
			log: [
				{
					level: "info",
					text: "tests:persistence:resolve conflict",
					args: [
						{
							updated,
							outdated,
							resolved,
						},
					],
				},
			],
			commit: [[resolved]],
		});
	};

	describe("resolveConflict", () => {
		it("take document with _rev over documents without _rev", () => {
			const a = sampleCurrency({ ...today, ...rev1 });
			const b = sampleCurrency({ ...yesterday });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: a,
			});
		});

		it("take document with _rev over documents without _rev reversed", () => {
			const a = sampleCurrency({ ...today });
			const b = sampleCurrency({ ...yesterday, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: b,
			});
		});

		it("take document latest and copy newer _rev", () => {
			const a = sampleCurrency({ ...today, ...rev1 });
			const b = sampleCurrency({ ...yesterday, ...rev2 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: { ...a, ...rev2 },
			});
		});

		it("take document with newer _rev a b reversed", () => {
			const a = sampleCurrency({ ...today, ...rev2 });
			const b = sampleCurrency({ ...yesterday, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: a,
				outdated: b,
				resolved: a,
			});
		});

		it("take document with _rev over documents without _rev with older date", () => {
			const a = sampleCurrency({ ...today });
			const b = sampleCurrency({ ...yesterday, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: b,
			});
		});

		it("chooses latest document between two with same _rev", () => {
			const a = sampleCurrency({ ...yesterday, ...rev1 });
			const b = sampleCurrency({ ...today, ...rev1 });
			persistence.resolveConflict(a, b);

			thenExpect({
				updated: b,
				outdated: a,
				resolved: { ...a, ...b },
			});
		});
	});
});
