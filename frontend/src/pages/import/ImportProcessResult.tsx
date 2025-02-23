import { compact, map } from "lodash";
import { useCallback } from "react";
import TableEditor from "../../components/TableEditor";
import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import Space, { VerticalSpace } from "../../components/base/Space";
import { TextDanger, TextNormal } from "../../components/base/Text";
import AccountField from "../../components/editor/AccountField";
import CurrencyAmountField from "../../components/editor/CurrencyAmountField";
import DateField from "../../components/editor/DateField";
import MemoField from "../../components/editor/MemoField";
import type { TAccountUUID } from "../../entities/Account";
import type TransactionStore from "../../entities/Transaction";
import type { ITransaction } from "../../entities/Transaction";
import type {
	ImportResult,
	ImportTask,
} from "../../shared/import/ImportContent";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

const classExisting = ["bg-cyan-900", "bg-cyan-950"];
const classUpdated = ["bg-fuchsia-900", "bg-fuchsia-950"];
const classRequired = ["bg-green-900", "bg-green-950"];

function classAlreadyExist<TValue>(
	transactions: TransactionStore,
	read: (entity: ITransaction) => TValue,
) {
	return (transaction: ITransaction, rowIndex: number) => {
		const { transaction_uuid } = transaction;
		const alreadyExists = transactions.byUuid(transaction_uuid);
		if (alreadyExists) {
			if (read(transaction) !== read(alreadyExists)) {
				return classUpdated[rowIndex % 2];
			}
			return classExisting[rowIndex % 2];
		}
		return "";
	};
}

function classAlreadyExistAccount<TValue>(
	transactions: TransactionStore,
	read: (entity: ITransaction) => TValue,
) {
	return (transaction: ITransaction, rowIndex: number) => {
		if (read(transaction) === "") {
			return classRequired[rowIndex % 2];
		}
		return classAlreadyExist(transactions, read)(transaction, rowIndex);
	};
}

function ImportProcessResultTable({
	result,
	referenceAccount,
}: {
	result: ImportResult;
	referenceAccount: TAccountUUID;
}) {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { currencies, accounts, transactions } = moneeeyStore;
	const readAccountOptionsForTransaction = (t: ITransaction) =>
		compact([
			...map(
				result.recommendedAccounts[t.transaction_uuid],
				(cur_account_uuid) => accounts.byUuid(cur_account_uuid),
			),
			...accounts.allActive,
		]);

	return (
		<TableEditor
			key={"importResultTransactions"}
			testId={"importResultTransactions"}
			creatable={false}
			store={result.localTransactions}
			schemaFilter={() => true}
			factory={result.localTransactions.factory}
			schema={[
				{
					title: Messages.util.date,
					width: 70,
					defaultSortOrder: "ascend",
					readOnly: true,
					validate: () => ({ valid: true }),
					customClass: classAlreadyExist(transactions, ({ date }) => date),
					...DateField<ITransaction>({
						read: ({ date }) => date,
						delta: () => ({}),
					}),
				},
				{
					title: Messages.transactions.from_account,
					width: 90,
					validate: () => ({ valid: true }),
					customClass: classAlreadyExistAccount(
						transactions,
						({ from_account }: ITransaction) => from_account,
					),
					readOnly: ({ from_account, to_account }: ITransaction) =>
						from_account === referenceAccount && from_account !== to_account,
					...AccountField<ITransaction>({
						read: ({ from_account }) => from_account,
						delta: (from_account) => ({ from_account }),
						clearable: true,
						readOptions: readAccountOptionsForTransaction,
					}),
				},
				{
					title: Messages.transactions.to_account,
					width: 90,
					validate: () => ({ valid: true }),
					customClass: classAlreadyExistAccount(
						transactions,
						({ to_account }: ITransaction) => to_account,
					),
					readOnly: ({ to_account, from_account }: ITransaction) =>
						to_account === referenceAccount && from_account !== to_account,
					...AccountField<ITransaction>({
						read: ({ to_account }) => to_account,
						delta: (to_account) => ({ to_account }),
						clearable: true,
						readOptions: readAccountOptionsForTransaction,
					}),
				},
				{
					title: Messages.transactions.amount,
					width: 140,
					readOnly: true,
					validate: () => ({ valid: true }),
					customClass: classAlreadyExist(
						transactions,
						({ from_value }) => from_value,
					),
					...CurrencyAmountField<ITransaction>({
						read: ({ from_account, from_value }) => ({
							currency: currencies.byUuid(
								accounts.byUuid(from_account)?.currency_uuid,
							),
							amount: from_value,
						}),
						delta: () => ({}),
					}),
				},
				{
					title: Messages.transactions.memo,
					width: 400,
					readOnly: true,
					validate: () => ({ valid: true }),
					customClass: classAlreadyExist(transactions, ({ memo }) => memo),
					...MemoField<ITransaction>({
						read: ({ memo }) => memo,
						delta: () => ({}),
					}),
				},
			]}
		/>
	);
}

const ImportProcessResult = ({
	task,
	result,
}: {
	task: ImportTask;
	result: ImportResult;
}) => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { transactions, navigation } = moneeeyStore;

	const onClose = useCallback(() => {
		navigation.removeImportingTask(task);
	}, [navigation, task]);

	const onImport = useCallback(() => {
		for (const t of result.localTransactions.all) {
			transactions.merge(t);
		}
		onClose();
	}, [result, transactions, onClose]);

	const onInvertFromTo = useCallback(() => {
		for (const t of result.localTransactions.all) {
			const { from_account, to_account } = t;

			result.localTransactions.merge({
				...t,
				from_account: to_account,
				to_account: from_account,
			});
		}
	}, [result]);

	return (
		<VerticalSpace className="h-full grow">
			<p>
				<TextNormal>{Messages.import.success(task.input.name)}</TextNormal>
			</p>
			<Space>
				<PrimaryButton onClick={onImport}>
					{Messages.import.import_transactions}
				</PrimaryButton>
				<SecondaryButton onClick={onInvertFromTo}>
					{Messages.import.invert_from_to_accounts}
				</SecondaryButton>
				<SecondaryButton onClick={onClose}>
					{Messages.util.cancel}
				</SecondaryButton>
				<div className="grow flex flex-row justify-end gap-2">
					<span className={`${classRequired[0]} py-1 px-2`}>
						{Messages.util.required}
					</span>
					<span className={`${classExisting[0]} py-1 px-2`}>
						{Messages.import.existing}
					</span>
					<span className={`${classUpdated[0]} py-1 px-2`}>
						{Messages.import.updated}
					</span>
				</div>
			</Space>
			{map(result.errors, (err) => (
				<TextDanger key={err.description}>
					{err.description} {err.data}
				</TextDanger>
			))}
			<div className="static flex-1">
				<ImportProcessResultTable
					referenceAccount={task.config.referenceAccount}
					result={result}
				/>
			</div>
		</VerticalSpace>
	);
};

export default ImportProcessResult;
