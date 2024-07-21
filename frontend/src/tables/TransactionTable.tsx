import { compact, isEmpty } from "lodash";
import { observer } from "mobx-react-lite";

import AccountField from "../components/editor/AccountField";
import CurrencyAmountField from "../components/editor/CurrencyAmountField";
import DateField from "../components/editor/DateField";
import MemoField from "../components/editor/MemoField";
import TransactionAmountField from "../components/editor/TransactionAmountField";

import TableEditor from "../components/TableEditor";
import type { TAccountUUID } from "../entities/Account";
import type TransactionStore from "../entities/Transaction";
import type { ITransaction } from "../entities/Transaction";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

interface TransactionSettingsProps {
	creatable?: boolean;
	transactions: TransactionStore;
	schemaFilter: (row: ITransaction) => boolean;
	referenceAccount: TAccountUUID;
	tableId: string;
}

const TransactionTable = observer(
	({
		creatable,
		transactions,
		schemaFilter,
		referenceAccount,
		tableId,
	}: TransactionSettingsProps) => {
		const Messages = useMessages();
		const { accounts, currencies } = useMoneeeyStore();

		const currencyForAccount = (account_uuid: TAccountUUID) =>
			currencies.byUuid(accounts.byUuid(account_uuid)?.currency_uuid);

		return (
			<TableEditor
				key={tableId}
				creatable={creatable}
				testId={"transactionTable"}
				store={transactions}
				schemaFilter={(row: ITransaction) => schemaFilter(row)}
				factory={transactions.factory}
				schema={compact([
					{
						title: Messages.util.date,
						width: 100,
						defaultSortOrder: "ascend",
						validate: () => ({ valid: true }),
						...DateField<ITransaction>({
							read: ({ date }) => date,
							delta: (date) => ({ date }),
						}),
					},
					{
						title: Messages.transactions.from_account,
						width: 140,
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
						width: 140,
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
					!isEmpty(referenceAccount) && {
						title: Messages.transactions.running_balance,
						width: 140,
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
					{
						title: Messages.transactions.memo,
						width: 400,
						validate: () => ({ valid: true }),
						...MemoField<ITransaction>({
							read: ({ memo }) => memo,
							delta: (memo) => ({ memo }),
						}),
					},
				])}
			/>
		);
	},
);

export default TransactionTable;
