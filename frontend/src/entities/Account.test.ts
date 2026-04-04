import { EntityType } from "../shared/Entity";
import Logger from "../shared/Logger";
import type MoneeeyStore from "../shared/MoneeeyStore";
import TagsStore from "../shared/Tags";
import { AccountKind, AccountStore, type IAccount } from "./Account";

const mockMoneeeyStore = () => {
	const logger = new Logger("test");
	const tags = new TagsStore(logger);
	return {
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
};

const makeAccount = (
	store: AccountStore,
	overrides: Partial<IAccount> = {},
): IAccount => {
	const base = store.factory();
	const account = { ...base, ...overrides };
	store.merge(account, { setUpdated: false });
	// biome-ignore lint/style/noNonNullAssertion: test helper, entity was just merged
	return store.byUuid(store.getUuid(account))!;
};

describe("AccountStore", () => {
	let moneeeyStore: MoneeeyStore;
	let store: AccountStore;

	beforeEach(() => {
		moneeeyStore = mockMoneeeyStore();
		store = new AccountStore(moneeeyStore);
	});

	describe("factory", () => {
		it("produces a valid default account", () => {
			const account = store.factory();
			expect(account.entity_type).toBe(EntityType.ACCOUNT);
			expect(account.kind).toBe(AccountKind.CHECKING);
			expect(account.offbudget).toBe(false);
			expect(account.archived).toBe(false);
			expect(account.currency_uuid).toBe("cur-default");
			expect(account.account_uuid).toBeTruthy();
		});

		it("uses provided id", () => {
			const account = store.factory("custom-id");
			expect(account.account_uuid).toBe("custom-id");
		});
	});

	describe("merge", () => {
		it("registers account name as tag", () => {
			makeAccount(store, { name: "Savings" });
			expect(moneeeyStore.tags.all).toContain("Savings");
		});

		it("unregisters old name when renamed", () => {
			const account = makeAccount(store, {
				account_uuid: "a1",
				name: "OldName",
			});
			store.merge({ ...account, name: "NewName" });
			expect(moneeeyStore.tags.all).not.toContain("OldName");
			expect(moneeeyStore.tags.all).toContain("NewName");
		});
	});

	describe("allActive", () => {
		it("filters out archived accounts", () => {
			makeAccount(store, { account_uuid: "a1", name: "Active" });
			makeAccount(store, {
				account_uuid: "a2",
				name: "Archived",
				archived: true,
			});
			expect(store.allActive.map((a) => a.name)).toEqual(["Active"]);
		});
	});

	describe("allPayees / allNonPayees", () => {
		beforeEach(() => {
			makeAccount(store, {
				account_uuid: "a1",
				name: "Bank",
				kind: AccountKind.CHECKING,
			});
			makeAccount(store, {
				account_uuid: "a2",
				name: "Grocery",
				kind: AccountKind.PAYEE,
			});
			makeAccount(store, {
				account_uuid: "a3",
				name: "Card",
				kind: AccountKind.CREDIT_CARD,
			});
		});

		it("allPayees returns only PAYEE accounts", () => {
			expect(store.allPayees.map((a) => a.name)).toEqual(["Grocery"]);
		});

		it("allNonPayees excludes PAYEE accounts", () => {
			expect(store.allNonPayees.map((a) => a.name)).toEqual(["Bank", "Card"]);
		});
	});

	describe("byName / uuidByName", () => {
		it("finds account by name", () => {
			makeAccount(store, { account_uuid: "a1", name: "MyBank" });
			expect(store.byName("MyBank")?.account_uuid).toBe("a1");
			expect(store.uuidByName("MyBank")).toBe("a1");
		});

		it("returns undefined for unknown name", () => {
			expect(store.byName("Unknown")).toBeUndefined();
		});
	});

	describe("accountTags", () => {
		it("returns name, tags, and currency tags for known account", () => {
			makeAccount(store, {
				account_uuid: "a1",
				name: "Bank",
				tags: ["personal"],
			});
			const tags = store.accountTags("a1");
			expect(tags).toContain("Bank");
			expect(tags).toContain("personal");
		});

		it("returns empty array for unknown uuid", () => {
			expect(store.accountTags("nonexistent")).toEqual([]);
		});
	});

	describe("nameForUuid", () => {
		it("returns name for known account", () => {
			makeAccount(store, { account_uuid: "a1", name: "Bank" });
			expect(store.nameForUuid("a1")).toBe("Bank");
		});

		it("returns empty string for unknown uuid", () => {
			expect(store.nameForUuid("nonexistent")).toBe("");
		});
	});

	describe("isArchived", () => {
		it("returns false for non-archived account", () => {
			makeAccount(store, { account_uuid: "a1", archived: false });
			expect(store.isArchived("a1")).toBe(false);
		});

		it("returns true for archived account", () => {
			makeAccount(store, { account_uuid: "a1", archived: true });
			expect(store.isArchived("a1")).toBe(true);
		});

		it("returns true for unknown uuid", () => {
			expect(store.isArchived("nonexistent")).toBe(true);
		});
	});

	describe("isOffBudget", () => {
		it("returns false for on-budget account", () => {
			makeAccount(store, { account_uuid: "a1", offbudget: false });
			expect(store.isOffBudget("a1")).toBe(false);
		});

		it("returns true for off-budget account", () => {
			makeAccount(store, { account_uuid: "a1", offbudget: true });
			expect(store.isOffBudget("a1")).toBe(true);
		});

		it("returns true for unknown uuid", () => {
			expect(store.isOffBudget("nonexistent")).toBe(true);
		});
	});
});
