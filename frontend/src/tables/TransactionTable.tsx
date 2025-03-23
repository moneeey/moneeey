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

const ColumnSchemaBase = (Messages: TMessages, middle: FieldDef<ITransaction>[]) => [
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
	...middle,
	{
		title: Messages.transactions.memo,
		width: 160,
		validate: () => ({ valid: true }),
		...MemoField<ITransaction>({
			read: ({ memo }) => memo,
			delta: (memo) => ({ memo }),
		}),
	},
]


const ColumnSchemaWithReferenceAccount = (Messages: TMessages, referenceAccount: TAccountUUID, accounts: AccountStore, currencyForAccount: (account_uuid: TAccountUUID) => ICurrency | undefined, transactions: TransactionStore) => ColumnSchemaBase(Messages, [
	{
		title: Messages.transactions.account,
		width: 160,
		validate: () => ({ valid: true }),
		...AccountField<ITransaction>({
			read: ({ to_account, from_account }) => referenceAccount === from_account ? to_account : from_account,
			delta: (new_account, { from_account }) => (referenceAccount === from_account ? { to_account: new_account } : { from_account: new_account }),
			clearable: true,
			readOptions: () => accounts.allActive,
		}),
	},
	{
		title: Messages.transactions.amount,
		width: 140,
		customClass: ({ from_account }) => referenceAccount === from_account ? "opacity-75" : "",
		validate: () => ({ valid: true }),
		...CurrencyAmountField<ITransaction>({
			read: ({ from_account, from_value, to_account, to_value }) => (
				referenceAccount === from_account ? {
					currency: currencyForAccount(from_account),
					amount: -from_value,
				} : {
					currency: currencyForAccount(to_account),
					amount: to_value,
				}
			),
			delta: ({ amount }, { from_account }) => (
				referenceAccount === from_account ? {
					from_value: amount,
				} : {
					to_value: amount,
				}
			),
		}),
	},
	{
		title: Messages.transactions.running_balance,
		width: 120,
		customClass: ({ transaction_uuid, from_account }) => {
				const balance =
					transactions.runningBalance.transactionRunningBalance.get(
						transaction_uuid,
					);
				const amount =
					(from_account === referenceAccount
						? balance?.from_balance
						: balance?.to_balance) || 0;
			return amount < 0 ? "opacity-75" : ""
		},
		validate: () => ({ valid: true }),
		...CurrencyAmountField<ITransaction>({
			read: ({ transaction_uuid, from_account }) => {
				const balance =
					transactions.runningBalance.transactionRunningBalance.get(
						transaction_uuid,
					);
				const amount =
					(from_account === referenceAccount
						? balance?.from_balance
						: balance?.to_balance) || 0;

				return {
					currency: currencyForAccount(referenceAccount),
					amount,
				};
			},
			delta: () => ({}),
		}),
	},
])

const ColumnSchemaWithoutReferenceAccount = (Messages: TMessages, accounts: AccountStore, currencyForAccount: (account_uuid: TAccountUUID) => ICurrency | undefined) => ColumnSchemaBase(Messages, [
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
	{
		title: Messages.transactions.amount,
		width: 140,
		validate: () => ({ valid: true }),
		...TransactionAmountField<ITransaction>({
			read: ({ from_account, from_value, to_account, to_value }) => ({
				from: {
					currency: currencyForAccount(from_account),
					amount: from_value,
				},
				to: {
					currency: currencyForAccount(to_account),
					amount: to_value,
				},
			}),
			delta: ({ from, to }) => ({
				from_value: from.amount,
				to_value: to.amount,
			}),
		}),
	},
])

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

		return (
			<TableEditor
				key={tableId}
				creatable={creatable}
				testId={"transactionTable"}
				store={transactions}
				schemaFilter={schemaFilter}
				factory={transactions.factory}
				schema={!isEmpty(referenceAccount) ? ColumnSchemaWithReferenceAccount(Messages, referenceAccount, accounts, currencyForAccount, transactions) : ColumnSchemaWithoutReferenceAccount(Messages, accounts, currencyForAccount)}
			/>
		);
	},
);