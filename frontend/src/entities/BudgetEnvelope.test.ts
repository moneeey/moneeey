import Logger from "../shared/Logger";
import type MoneeeyStore from "../shared/MoneeeyStore";
import TagsStore from "../shared/Tags";
import { AccountKind, AccountStore, type IAccount } from "./Account";
import { BudgetStore, type IBudget } from "./Budget";
import TransactionStore, { type ITransaction } from "./Transaction";

type TestStore = MoneeeyStore & {
	accounts: AccountStore;
	transactions: TransactionStore;
	budget: BudgetStore;
};

const makeTestStore = (): TestStore => {
	const logger = new Logger("budget-envelope-test");
	const tags = new TagsStore(logger);
	const brl = {
		currency_uuid: "cur-brl",
		short: "BRL",
		prefix: "R$",
		suffix: "",
		decimals: 2,
		name: "Brazilian Real",
	};
	const btc = {
		currency_uuid: "cur-btc",
		short: "BTC",
		prefix: "₿",
		suffix: "",
		decimals: 8,
		name: "Bitcoin",
	};
	const currenciesByUuid = new Map<string, unknown>([
		["cur-brl", brl],
		["cur-btc", btc],
	]);
	const store = {
		logger,
		tags,
		currencies: {
			all: [brl, btc],
			byUuid: (id: string) => currenciesByUuid.get(id),
			currencyTags: () => [],
		},
		config: {
			main: { default_currency: "cur-brl" },
		},
	} as unknown as TestStore;

	store.accounts = new AccountStore(store);
	store.transactions = new TransactionStore(store);
	store.budget = new BudgetStore(store);
	return store;
};

const makeAccount = (
	accounts: AccountStore,
	overrides: Partial<IAccount>,
): IAccount => {
	const base = accounts.factory();
	const account = { ...base, ...overrides } as IAccount;
	accounts.merge(account, { setUpdated: false });
	// biome-ignore lint/style/noNonNullAssertion: test helper, entity was just merged
	return accounts.byUuid(accounts.getUuid(account))!;
};

const makeTransaction = (
	transactions: TransactionStore,
	overrides: Partial<ITransaction>,
): ITransaction => {
	const base = transactions.factory();
	const tx = { ...base, ...overrides } as ITransaction;
	transactions.merge(tx, { setUpdated: false });
	// biome-ignore lint/style/noNonNullAssertion: test helper, entity was just merged
	return transactions.byUuid(transactions.getUuid(tx))!;
};

const makeBudget = (
	budgetStore: BudgetStore,
	overrides: Partial<IBudget>,
): IBudget => {
	const base = budgetStore.factory();
	const b = { ...base, ...overrides } as IBudget;
	budgetStore.merge(b, { setUpdated: false });
	// biome-ignore lint/style/noNonNullAssertion: test helper, entity was just merged
	return budgetStore.byUuid(budgetStore.getUuid(b))!;
};

describe("BudgetEnvelope multi-currency aggregation", () => {
	it("produces one envelope row per currency found in matching transactions", async () => {
		const store = makeTestStore();

		// Two on-budget accounts, one per currency.
		makeAccount(store.accounts, {
			account_uuid: "acc-brl",
			name: "BRL Checking",
			currency_uuid: "cur-brl",
			kind: AccountKind.CHECKING,
			offbudget: false,
		});
		makeAccount(store.accounts, {
			account_uuid: "acc-btc",
			name: "BTC Wallet",
			currency_uuid: "cur-btc",
			kind: AccountKind.CHECKING,
			offbudget: false,
		});
		makeAccount(store.accounts, {
			account_uuid: "acc-payee",
			name: "Restaurant",
			currency_uuid: "cur-brl",
			kind: AccountKind.PAYEE,
			offbudget: false,
		});

		// Budget is just a tag search — no currency_uuid.
		makeBudget(store.budget, {
			budget_uuid: "b1",
			name: "Food",
			tags: ["food"],
		});

		// Transaction in BRL — tagged via the transaction's tags field.
		makeTransaction(store.transactions, {
			transaction_uuid: "t1",
			date: "2024-01-15",
			from_account: "acc-brl",
			to_account: "acc-payee",
			from_value: 100,
			to_value: 100,
			tags: ["food"],
			memo: "",
		});

		// Transaction in BTC — tagged via a #hashtag inside memo.
		makeTransaction(store.transactions, {
			transaction_uuid: "t2",
			date: "2024-01-20",
			from_account: "acc-btc",
			to_account: "acc-payee",
			from_value: 0.5,
			to_value: 0.5,
			tags: [],
			memo: "lunch #food",
		});

		// Kick off aggregation; calculateRemaining is debounced so flush to await it.
		store.budget.makeEnvelopes("2024-01-01", () => {});
		await store.budget.envelopes.calculateRemaining.flush();

		const januaryEnvelopesForB1 = store.budget.envelopes.all.filter(
			(env) =>
				env.budget_uuid === "b1" && env.starting === "2024-01-01",
		);

		expect(januaryEnvelopesForB1).toHaveLength(2);

		const brlEnvelope = januaryEnvelopesForB1.find(
			(env) => env.currency_uuid === "cur-brl",
		);
		const btcEnvelope = januaryEnvelopesForB1.find(
			(env) => env.currency_uuid === "cur-btc",
		);

		expect(brlEnvelope).toBeDefined();
		expect(btcEnvelope).toBeDefined();
		expect(brlEnvelope?.used).toBe(100);
		expect(btcEnvelope?.used).toBe(0.5);

		// Flush the TransactionStore running-balance debounce so it doesn't
		// log after the test teardown.
		store.transactions.updateRunningBalance.flush();
	});
});
