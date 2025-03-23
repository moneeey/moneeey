import { isEmpty } from "lodash";
import { observer } from "mobx-react-lite";

import AccountField from "../components/editor/AccountField";
import CurrencyAmountField from "../components/editor/CurrencyAmountField";
import DateField from "../components/editor/DateField";
import MemoField from "../components/editor/MemoField";
import TransactionAmountField from "../components/editor/TransactionAmountField";

import TableEditor from "../components/TableEditor";
import type { AccountStore, TAccountUUID } from "../entities/Account";
import type TransactionStore from "../entities/Transaction";
import type { ITransaction } from "../entities/Transaction";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages, { TMessages } from "../utils/Messages";
import { FieldDef } from "../components/editor/FieldDef";
import { ICurrency } from "../entities/Currency";

interface TransactionSettingsProps {
	creatable?: boolean;
	transactions: TransactionStore;
	schemaFilter: (row: ITransaction) => boolean;
	referenceAccount: TAccountUUID;
	tableId: string;
}

export default observer(
	({
		creatable,
		transactions,
		schemaFilter,
		referenceAccount,
		tableId,
	}: TransactionSettingsProps) => {
		const Messages = useMessages();
		const { accounts, currencies, config } = useMoneeeyStore();

		const currencyForAccount = (account_uuid: TAccountUUID): ICurrency | undefined =>
			currencies.byUuid(accounts.byUuid(account_uuid)?.currency_uuid) ?? currencies.byUuid(config.main.default_currency);

		const getOther = function<T>({ from, to, from_account, to_account }: { from: T, to: T, from_account: TAccountUUID | null, to_account: TAccountUUID | null }): T {
			if (referenceAccount === to_account) return from;
			return referenceAccount === from_account ? to : from;
		};

		const getOtherAccount = ({ to_account, from_account }: { to_account: TAccountUUID | null, from_account: TAccountUUID | null }): TAccountUUID => {
			return getOther({ from: from_account ?? "", to: to_account ?? "", from_account, to_account });
		};

		const getReferenceBalance = (transaction_uuid: string, { from_account, to_account }: { from_account: TAccountUUID | null, to_account: TAccountUUID | null }) => {
			const balance = transactions.runningBalance.transactionRunningBalance.get(transaction_uuid);
			if (referenceAccount === to_account) return balance?.to_balance ?? 0;
			if (referenceAccount === from_account) return balance?.from_balance ?? 0;
			return 0;
		};

		return (
			<TableEditor
				key={tableId}
				creatable={creatable}
				testId={"transactionTable"}
				store={transactions}
				schemaFilter={schemaFilter}
				factory={transactions.factory}
				schema={[
					{
						title: Messages.util.date,
						width: 72,
						defaultSortOrder: "ascend" as const,
						validate: () => ({ valid: true }),
						...DateField<ITransaction>({
							read: ({ date }) => date,
							delta: (date) => ({ date }),
						}),
					},
					...(!isEmpty(referenceAccount) ? [
						{
							title: Messages.transactions.account,
							width: 160,
							validate: () => ({ valid: true }),
							...AccountField<ITransaction>({
								read: getOtherAccount,
								delta: (new_account, transaction) => {
									const { field } = getOther({
										from: { field: "from_account" as const },
										to: { field: "to_account" as const },
										from_account: transaction.from_account,
										to_account: transaction.to_account
									});
									return { 
										[field]: new_account,
										[field === "from_account" ? "to_account" : "from_account"]: referenceAccount
									};
								},
								clearable: true,
								readOptions: () => accounts.allActive,
							}),
						},
					] : [
						{
							title: Messages.transactions.from_account,
							width: 90,
							validate: () => ({ valid: true }),
							...AccountField<ITransaction>({
								read: ({ from_account }) => from_account,
								delta: (from_account) => ({ from_account }),
								clearable: true,
								readOptions: () => accounts.allActive,
							}),
						},
						{
							title: Messages.transactions.to_account,
							width: 90,
							validate: () => ({ valid: true }),
							...AccountField<ITransaction>({
								read: ({ to_account }) => to_account,
								delta: (to_account) => ({ to_account }),
								clearable: true,
								readOptions: () => accounts.allActive,
							}),
						},
					]),
						{
							title: Messages.transactions.amount,
							width: 140,
							customClass: ({ from_account, to_account }: { from_account: TAccountUUID | null, to_account: TAccountUUID | null }) => {
								if (!referenceAccount) return "";
								return referenceAccount === from_account ? "text-red-200" :
									referenceAccount === to_account ? "text-green-200" :
									"";
							},
							validate: () => ({ valid: true }),
							...TransactionAmountField<ITransaction>({
								read: ({ from_account, from_value, to_account, to_value }) => ({
									from: {
										currency: currencyForAccount(from_account),
										amount: referenceAccount === from_account ? -from_value : from_value,
									},
									to: {
										currency: currencyForAccount(to_account),
										amount: to_value,
									},
								}),
								delta: ({ from, to }, { from_account, to_account }) => {
									if ((referenceAccount === to_account && to.amount < 0) || (referenceAccount === from_account && from.amount > 0)) {
										return {
											from_account: to_account,
											to_account: from_account,
											from_value: Math.abs(to.amount),
											to_value: Math.abs(from.amount),
										};
									}
									return {
										from_value: Math.abs(from.amount),
										to_value: Math.abs(to.amount),
									};
								},
							}),
						},
					...(!isEmpty(referenceAccount) ? [
						{
							title: Messages.transactions.running_balance,
							width: 120,
							customClass: ({ transaction_uuid, from_account, to_account }: { transaction_uuid: string, from_account: TAccountUUID | null, to_account: TAccountUUID | null }) => {
								const amount = getReferenceBalance(transaction_uuid, { from_account, to_account });
								return amount < 0 ? "text-red-200" : "text-green-200";
							},
							validate: () => ({ valid: true }),
							...CurrencyAmountField<ITransaction>({
								read: ({ transaction_uuid, from_account, to_account }) => ({
									currency: currencyForAccount(referenceAccount),
									amount: getReferenceBalance(transaction_uuid, { from_account, to_account }),
								}),
								delta: () => ({}),
							}),
						},
					] : []),
					{
						title: Messages.transactions.memo,
						width: 160,
						validate: () => ({ valid: true }),
						...MemoField<ITransaction>({
							read: ({ memo }) => memo,
							delta: (memo) => ({ memo }),
						}),
					},
				]}
			/>
		);
	},
);