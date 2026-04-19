import type { AccountStore, TAccountUUID } from "../entities/Account";
import type ConfigStore from "../entities/Config";
import type { CurrencyStore, ICurrency } from "../entities/Currency";
import type TransactionStore from "../entities/Transaction";

export const currencyForAccount = (
	account_uuid: TAccountUUID,
	accounts: AccountStore,
	currencies: CurrencyStore,
	config: ConfigStore,
): ICurrency | undefined =>
	currencies.byUuid(accounts.byUuid(account_uuid)?.currency_uuid) ??
	currencies.byUuid(config.main.default_currency);

export const getOther = <T>({
	from,
	to,
	from_account,
	to_account,
	referenceAccount,
}: {
	from: T;
	to: T;
	from_account: TAccountUUID | null;
	to_account: TAccountUUID | null;
	referenceAccount: TAccountUUID;
}): T => {
	if (referenceAccount === to_account) return from;
	return referenceAccount === from_account ? to : from;
};

export const getOtherAccount = ({
	to_account,
	from_account,
	referenceAccount,
}: {
	to_account: TAccountUUID | null;
	from_account: TAccountUUID | null;
	referenceAccount: TAccountUUID;
}): TAccountUUID =>
	getOther({
		from: from_account ?? "",
		to: to_account ?? "",
		from_account,
		to_account,
		referenceAccount,
	});

export const getReferenceBalance = (
	transaction_uuid: string,
	{
		from_account,
		to_account,
		referenceAccount,
	}: {
		from_account: TAccountUUID | null;
		to_account: TAccountUUID | null;
		referenceAccount: TAccountUUID;
	},
	transactions: TransactionStore,
): number => {
	const balance =
		transactions.runningBalance.transactionRunningBalance.get(transaction_uuid);
	if (referenceAccount === to_account) return balance?.to_balance ?? 0;
	if (referenceAccount === from_account) return balance?.from_balance ?? 0;
	return 0;
};
