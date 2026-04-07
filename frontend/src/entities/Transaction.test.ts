import { EntityType } from "../shared/Entity";
import Logger from "../shared/Logger";
import type MoneeeyStore from "../shared/MoneeeyStore";
import TagsStore from "../shared/Tags";
import { AccountStore } from "./Account";
import TransactionStore, {
	type ITransaction,
	isTransaction,
	mockTransaction,
} from "./Transaction";

const mockMoneeeyStore = () => {
	const logger = new Logger("test");
	const tags = new TagsStore(logger);
	const store = {
		logger,
		tags,
		currencies: {
			all: [{ currency_uuid: "cur-default" }],
			currencyTags: () => [],
		},
		config: {
			main: { default_currency: "cur-default" },
		},
	} as unknown as MoneeeyStore;
	return store;
};

const makeTx = (
	store: TransactionStore,
	overrides: Partial<ITransaction> = {},
): ITransaction => {
	const base = store.factory();
	const tx = { ...base, ...overrides };
	store.merge(tx, { setUpdated: false });
	// biome-ignore lint/style/noNonNullAssertion: test helper, entity was just merged
	return store.byUuid(store.getUuid(tx))!;
};

describe("isTransaction", () => {
	it("returns true for transaction entities", () => {
		expect(isTransaction({ entity_type: EntityType.TRANSACTION })).toBe(true);
	});

	it("returns false for other entities", () => {
		expect(isTransaction({ entity_type: EntityType.ACCOUNT })).toBe(false);
	});

	it("returns false for empty object", () => {
		expect(isTransaction({})).toBe(false);
	});
});

describe("mockTransaction", () => {
	it("returns a complete transaction with defaults", () => {
		const tx = mockTransaction({
			transaction_uuid: "t1",
			from_account: "a1",
			to_account: "a2",
			from_value: 100,
		});
		expect(tx.entity_type).toBe(EntityType.TRANSACTION);
		expect(tx.to_value).toBe(100);
		expect(tx.date).toBe("2023-02-01");
		expect(tx.memo).toBe("");
		expect(tx.tags).toEqual([]);
	});

	it("allows overriding defaults", () => {
		const tx = mockTransaction({
			transaction_uuid: "t1",
			from_account: "a1",
			to_account: "a2",
			from_value: 100,
			to_value: 200,
			memo: "test",
		});
		expect(tx.to_value).toBe(200);
		expect(tx.memo).toBe("test");
	});
});

describe("TransactionStore", () => {
	let moneeeyStore: MoneeeyStore;
	let store: TransactionStore;

	beforeEach(() => {
		moneeeyStore = mockMoneeeyStore();
		store = new TransactionStore(moneeeyStore);
		// Wire up accounts on the mock so viewAllNonPayees works
		(
			moneeeyStore as unknown as { transactions: TransactionStore }
		).transactions = store;
	});

	describe("factory", () => {
		it("produces a valid default transaction", () => {
			const tx = store.factory();
			expect(tx.entity_type).toBe(EntityType.TRANSACTION);
			expect(tx.from_value).toBe(0);
			expect(tx.to_value).toBe(0);
			expect(tx.from_account).toBe("");
			expect(tx.to_account).toBe("");
			expect(tx.transaction_uuid).toBeTruthy();
		});

		it("uses provided id", () => {
			const tx = store.factory("custom-id");
			expect(tx.transaction_uuid).toBe("custom-id");
		});
	});

	describe("merge", () => {
		it("adds a transaction to the store", () => {
			makeTx(store, { transaction_uuid: "t1", from_value: 50, to_value: 50 });
			expect(store.byUuid("t1")).toBeDefined();
			expect(store.byUuid("t1")?.from_value).toBe(50);
		});

		it("throws on negative from_value", () => {
			expect(() =>
				makeTx(store, { transaction_uuid: "t1", from_value: -10 }),
			).toThrow("Transaction amounts must be positive numbers");
		});

		it("throws on negative to_value", () => {
			expect(() =>
				makeTx(store, { transaction_uuid: "t1", to_value: -10 }),
			).toThrow("Transaction amounts must be positive numbers");
		});

		it("tracks newest_dt", () => {
			makeTx(store, { transaction_uuid: "t1", date: "2099-12-31" });
			expect(store.newest_dt.getFullYear()).toBe(2099);
		});

		it("tracks oldest_dt", () => {
			makeTx(store, { transaction_uuid: "t1", date: "1990-01-01" });
			expect(store.oldest_dt.getFullYear()).toBe(1990);
		});
	});

	describe("sortTransactions / sorted", () => {
		it("sorts transactions by date ascending", () => {
			makeTx(store, { transaction_uuid: "t1", date: "2024-03-01" });
			makeTx(store, { transaction_uuid: "t2", date: "2024-01-01" });
			makeTx(store, { transaction_uuid: "t3", date: "2024-02-01" });
			const ids = store.sorted.map((t) => t.transaction_uuid);
			expect(ids).toEqual(["t2", "t3", "t1"]);
		});
	});

	describe("findAllAfter", () => {
		beforeEach(() => {
			makeTx(store, { transaction_uuid: "t1", date: "2024-01-01" });
			makeTx(store, { transaction_uuid: "t2", date: "2024-06-01" });
			makeTx(store, { transaction_uuid: "t3", date: "2024-12-01" });
		});

		it("returns transactions on or after the date", () => {
			const results = store.findAllAfter("2024-06-01");
			const ids = results.map((t) => t.transaction_uuid);
			expect(ids).toEqual(["t2", "t3"]);
		});

		it("returns empty when none match", () => {
			expect(store.findAllAfter("2025-01-01")).toEqual([]);
		});
	});

	describe("filterByAccounts / viewAllWithAccount(s)", () => {
		beforeEach(() => {
			makeTx(store, {
				transaction_uuid: "t1",
				from_account: "bank",
				to_account: "grocery",
				date: "2024-01-01",
			});
			makeTx(store, {
				transaction_uuid: "t2",
				from_account: "bank",
				to_account: "gas",
				date: "2024-02-01",
			});
			makeTx(store, {
				transaction_uuid: "t3",
				from_account: "card",
				to_account: "restaurant",
				date: "2024-03-01",
			});
		});

		it("viewAllWithAccount matches from or to", () => {
			const results = store.viewAllWithAccount("bank");
			expect(results.map((t) => t.transaction_uuid)).toEqual(["t1", "t2"]);
		});

		it("viewAllWithAccounts matches multiple accounts", () => {
			const results = store.viewAllWithAccounts(["grocery", "restaurant"]);
			expect(results.map((t) => t.transaction_uuid)).toEqual(["t1", "t3"]);
		});

		it("returns sorted results", () => {
			const results = store.viewAllWithAccount("bank");
			expect(results[0].date <= results[1].date).toBe(true);
		});
	});

	describe("viewAllUnclassified", () => {
		it("returns transactions with empty from or to account", () => {
			makeTx(store, {
				transaction_uuid: "t1",
				from_account: "",
				to_account: "grocery",
				date: "2024-01-01",
			});
			makeTx(store, {
				transaction_uuid: "t2",
				from_account: "bank",
				to_account: "gas",
				date: "2024-02-01",
			});
			const results = store.viewAllUnclassified();
			expect(results.map((t) => t.transaction_uuid)).toEqual(["t1"]);
		});
	});

	describe("getAllTransactionTags / filterByTag / getSearchBuffer", () => {
		let accountsStore: AccountStore;

		beforeEach(() => {
			accountsStore = new AccountStore(moneeeyStore);
			(moneeeyStore as unknown as { accounts: AccountStore }).accounts =
				accountsStore;

			const acctBase = accountsStore.factory();
			accountsStore.merge(
				{
					...acctBase,
					account_uuid: "bank",
					name: "MyBank",
					tags: ["finance"],
				},
				{ setUpdated: false },
			);
			accountsStore.merge(
				{
					...acctBase,
					account_uuid: "grocery",
					name: "Grocery",
					tags: ["food"],
				},
				{ setUpdated: false },
			);
		});

		it("getAllTransactionTags combines account tags and memo-derived tags", () => {
			const tx = makeTx(store, {
				transaction_uuid: "t1",
				from_account: "bank",
				to_account: "grocery",
				memo: "shopping #weekly",
				date: "2024-01-01",
			});
			const tags = store.getAllTransactionTags(tx, accountsStore);
			expect(tags).toContain("MyBank");
			expect(tags).toContain("finance");
			expect(tags).toContain("Grocery");
			expect(tags).toContain("food");
			expect(tags).toContain("weekly");
		});

		it("filterByTag matches case-insensitively", () => {
			makeTx(store, {
				transaction_uuid: "t1",
				from_account: "bank",
				to_account: "grocery",
				date: "2024-01-01",
			});
			makeTx(store, {
				transaction_uuid: "t2",
				from_account: "grocery",
				to_account: "bank",
				date: "2024-02-01",
			});
			const predicate = store.filterByTag("FINANCE", accountsStore);
			const results = store.all.filter(predicate);
			expect(results.map((t) => t.transaction_uuid)).toEqual(["t1", "t2"]);
		});

		it("viewAllWithTag returns sorted filtered results", () => {
			makeTx(store, {
				transaction_uuid: "t1",
				from_account: "bank",
				to_account: "grocery",
				memo: "#special",
				date: "2024-03-01",
			});
			makeTx(store, {
				transaction_uuid: "t2",
				from_account: "bank",
				to_account: "grocery",
				date: "2024-01-01",
			});
			const results = store.viewAllWithTag("special", accountsStore);
			expect(results.map((t) => t.transaction_uuid)).toEqual(["t1"]);
		});

		it("getSearchBuffer includes tags, memo, and date", () => {
			const tx = makeTx(store, {
				transaction_uuid: "t1",
				from_account: "bank",
				to_account: "grocery",
				memo: "weekly groceries",
				date: "2024-01-15",
			});
			const buffer = store.getSearchBuffer(tx, accountsStore);
			expect(buffer).toContain("MyBank");
			expect(buffer).toContain("weekly groceries");
			expect(buffer).toContain("2024-01-15");
		});
	});

	describe("replaceAccount", () => {
		it("replaces account references in all matching transactions", () => {
			makeTx(store, {
				transaction_uuid: "t1",
				from_account: "old",
				to_account: "other",
				date: "2024-01-01",
			});
			makeTx(store, {
				transaction_uuid: "t2",
				from_account: "other",
				to_account: "old",
				date: "2024-02-01",
			});
			makeTx(store, {
				transaction_uuid: "t3",
				from_account: "other",
				to_account: "another",
				date: "2024-03-01",
			});

			store.replaceAccount("old", "new");

			expect(store.byUuid("t1")?.from_account).toBe("new");
			expect(store.byUuid("t1")?.to_account).toBe("other");
			expect(store.byUuid("t2")?.from_account).toBe("other");
			expect(store.byUuid("t2")?.to_account).toBe("new");
			expect(store.byUuid("t3")?.from_account).toBe("other");
			expect(store.byUuid("t3")?.to_account).toBe("another");
		});
	});
});
