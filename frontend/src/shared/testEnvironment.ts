import { AccountKind, type IAccount } from "../entities/Account";
import type { ICurrency } from "../entities/Currency";
import type { ITransaction } from "../entities/Transaction";
import { currentDate } from "../utils/Date";
import type { LanguageCode } from "../utils/Messages";
import { StorageKind, setStorage } from "../utils/Utils";
import MoneeeyStore from "./MoneeeyStore";
import { setupNewEncryption } from "./encryption/codec";
import type { LocalStore } from "./storage/LocalStore";

type TSeedAccount = Partial<IAccount> & {
	name: string;
	currency?: string;
	initialBalance?: number;
};

type TSeedTransaction = Partial<ITransaction> & {
	from: string;
	to: string;
	amount?: number;
	fromValue?: number;
	toValue?: number;
};

export type TTestEnvironmentOptions = {
	passphrase?: string;
	accounts?: TSeedAccount[];
	transactions?: TSeedTransaction[];
	skipTour?: boolean;
};

type TBootstrappedTestEnvironmentOptions = TTestEnvironmentOptions & {
	localStore: LocalStore;
	selectLanguage: (code: LanguageCode) => void;
	setMoneeeyStore: (store: MoneeeyStore) => void;
};

const DEFAULT_TEST_PASSPHRASE = "playwright-test-pass-123";

const defaultAccounts: TSeedAccount[] = [
	{
		id: "test-account-01-banco",
		name: "Banco Moneeey",
		currency: "BRL",
		initialBalance: 1234.56,
	},
	{
		id: "test-account-02-card",
		name: "MoneeeyCard",
		currency: "BRL",
		initialBalance: 2000,
	},
	{
		id: "test-account-03-bitcoin",
		name: "Bitcoinss",
		currency: "BTC",
		initialBalance: 0.12345678,
	},
];

const currencyByName = (store: MoneeeyStore, name: string): ICurrency => {
	const currency = store.currencies.findByName(name);
	if (!currency) throw new Error(`Test currency not found: ${name}`);
	return currency;
};

const ensureAccount = (
	store: MoneeeyStore,
	seed: TSeedAccount,
	defaultCurrency: ICurrency,
) => {
	const {
		currency: _currency,
		initialBalance: _initialBalance,
		...accountSeed
	} = seed;
	const currency = seed.currency
		? currencyByName(store, seed.currency)
		: defaultCurrency;
	const account = store.accounts.factory(seed.id);
	store.accounts.merge({
		...account,
		...accountSeed,
		id: seed.id ?? account.id,
		name: seed.name,
		created: accountSeed.created ?? account.created,
		kind: seed.kind ?? AccountKind.CHECKING,
		currency_uuid: seed.currency_uuid ?? currency.id,
	});
	return store.accounts.byUuid(seed.id ?? account.id) ?? account;
};

const addInitialBalance = (
	store: MoneeeyStore,
	currency: ICurrency,
	account: IAccount,
	amount: number,
) => {
	const initialAccountId = `test-initial-balance-${currency.short}`;
	const initialAccount = store.accounts.factory(initialAccountId);
	store.accounts.merge({
		...initialAccount,
		name: `Initial balance ${currency.short}`,
		kind: AccountKind.PAYEE,
		currency_uuid: currency.id,
	});
	const transaction = store.transactions.factory(
		`test-transaction-initial-${account.id}`,
	);
	store.transactions.merge({
		...transaction,
		from_account: initialAccountId,
		from_value: amount,
		to_account: account.id,
		to_value: amount,
	});
};

const accountBySeedRef = (store: MoneeeyStore, ref: string) => {
	const account = store.accounts.byUuid(ref) ?? store.accounts.byName(ref);
	if (!account) throw new Error(`Test account not found: ${ref}`);
	return account;
};

const seedTransaction = (
	store: MoneeeyStore,
	seed: TSeedTransaction,
	index: number,
) => {
	const {
		from: fromRef,
		to: toRef,
		amount,
		fromValue,
		toValue,
		...txSeed
	} = seed;
	const from = accountBySeedRef(store, fromRef);
	const to = accountBySeedRef(store, toRef);
	const defaultAmount = amount ?? 0;
	const transaction = store.transactions.factory(
		seed.id ?? `test-transaction-${String(index).padStart(2, "0")}`,
	);
	store.transactions.merge({
		...transaction,
		...txSeed,
		id: seed.id ?? transaction.id,
		date: seed.date ?? currentDate(),
		from_account: from.id,
		to_account: to.id,
		from_value: fromValue ?? seed.from_value ?? defaultAmount,
		to_value: toValue ?? seed.to_value ?? defaultAmount,
		memo: seed.memo ?? "",
	});
};

export async function moneeeySetupTestEnvironment({
	localStore,
	selectLanguage,
	setMoneeeyStore,
	passphrase = DEFAULT_TEST_PASSPHRASE,
	accounts = defaultAccounts,
	transactions = [],
	skipTour = true,
}: TBootstrappedTestEnvironmentOptions) {
	setStorage("language", "en", StorageKind.PERMANENT);
	if (skipTour) setStorage("landing", "true", StorageKind.PERMANENT);
	selectLanguage("en");

	await localStore.open();
	await localStore.clearAll();
	const dataKey = await setupNewEncryption(localStore, passphrase);
	const store = new MoneeeyStore(localStore);
	store.persistence.setDataKey(dataKey);
	await store.load();

	const brl = currencyByName(store, "BRL");
	store.config.merge({ ...store.config.main, default_currency: brl.id });

	for (const seed of accounts) {
		const account = ensureAccount(store, seed, brl);
		if (seed.initialBalance !== undefined) {
			addInitialBalance(
				store,
				store.currencies.byUuid(account.currency_uuid) ?? brl,
				account,
				seed.initialBalance,
			);
		}
	}

	transactions.forEach((seed, index) => seedTransaction(store, seed, index));
	await store.persistence.flush();
	setMoneeeyStore(store);
	window.location.hash = "/dashboard";
}

declare global {
	interface Window {
		moneeeySetupTestEnvironment?: (
			options?: TTestEnvironmentOptions,
		) => Promise<void>;
	}
}
