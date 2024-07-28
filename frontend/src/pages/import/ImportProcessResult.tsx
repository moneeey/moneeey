import { compact, map } from "lodash";
import { useMemo } from "react";
import TableEditor from "../../components/TableEditor";
import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import Space, { VerticalSpace } from "../../components/base/Space";
import { TextDanger, TextNormal } from "../../components/base/Text";
import AccountField from "../../components/editor/AccountField";
import CurrencyAmountField from "../../components/editor/CurrencyAmountField";
import DateField from "../../components/editor/DateField";
import MemoField from "../../components/editor/MemoField";
import TransactionStore, {
	type ITransaction,
} from "../../entities/Transaction";
import type {
	ImportResult,
	ImportTask,
} from "../../shared/import/ImportContent";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

/*
const accountRender =
	({
		Messages,
		field,
		referenceAccount,
		moneeeyStore,
		transactions,
		result,
		setResult,
	}: {
		Messages: TMessages;
		field: keyof ITransaction;
		referenceAccount: TAccountUUID;
		moneeeyStore: MoneeeyStore;
		transactions: ITransaction[];
		result: ImportResult;
		setResult: Dispatch<SetStateAction<ImportResult>>;
	}) =>
	(row: Row) =>
		changedRender({
			Messages,
			moneeeyStore,
			transactions,
			row,
			field,
			cell: ({ isChanged, isNew }) => {
				const transaction = transactions.find(
					(t) => t.transaction_uuid === row.entityId,
				);
				if (!transaction) {
					return <span />;
				}
				const account_uuid = transaction[field];

				if (
					referenceAccount === account_uuid &&
					transaction.from_account !== transaction.to_account
				) {
					return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>;
				}

				let clz = "";
				if (isChanged) {
					clz = "mn-select-changed";
				}
				if (isNew) {
					clz = "mn-select-new";
				}

				const accountSelectorField = AccountField<ITransaction>({
					read: (entity) => entity[field] as TAccountUUID,
					delta: (selected_account_uuid) => ({
						[field]: selected_account_uuid,
					}),
					clearable: true,
					readOptions: () =>
						compact([
							...map(
								result?.recommended_accounts[transaction.transaction_uuid],
								(cur_account_uuid) =>
									moneeeyStore.accounts.byUuid(cur_account_uuid),
							),
							...moneeeyStore.accounts.allActive,
						]),
				});

				return (
					<div className={clz}>
						<accountSelectorField.render
							rev={transaction._rev || ""}
							entity={transaction}
							field={{ title: "Account" } as FieldDef<ITransaction>}
							isError={false}
							commit={(updated_transaction) => {
								setResult((currentResult) => ({
									...currentResult,
									transactions: map(result?.transactions, (t) =>
										t.transaction_uuid === transaction.transaction_uuid
											? updated_transaction
											: t,
									),
								}));
							}}
						/>
					</div>
				);
			},
		});

const changedRender = ({
	Messages,
	row,
	cell,
	field,
	moneeeyStore,
	transactions,
}: {
	Messages: TMessages;
	row: Row;
	cell: (props: { isChanged: boolean; isNew: boolean }) => JSX.Element;
	field: keyof ITransaction;
	moneeeyStore: MoneeeyStore;
	transactions: ITransaction[];
}) => {
	let isChanged = false;
	let isNew = true;
	let color = "text-green-200";
	let title = Messages.import.new;
	if (field) {
		const isAccountColumn = (field as string).indexOf("_account") > 0;
		const original = moneeeyStore.transactions.byUuid(row.entityId || "");
		if (original) {
			const originalValue = original[field];
			const cellValue = transactions.find(
				(t) => t.transaction_uuid === row.entityId,
			)?.[field];
			if (!isEmpty(originalValue) || isNumber(originalValue)) {
				const format = (value: unknown) =>
					isAccountColumn
						? moneeeyStore.accounts.nameForUuid(value as string)
						: (value as string);
				const originalFormattedValue = format(originalValue);
				const newFormattedValue = format(cellValue);
				isChanged = originalFormattedValue !== newFormattedValue;
				if (isChanged) {
					title = Messages.import.changed_description(
						originalFormattedValue,
						newFormattedValue,
					);
					color = "text-orange-200";
					isNew = false;
				} else {
					title = Messages.import.unchanged;
					color = "text-white";
					isNew = false;
				}
			}
		}
	}

	return (
		<span className={`flex flex-row items-center ${color}`} title={title}>
			<span className="grow">{cell({ isChanged, isNew })}</span>
		</span>
	);
};

const fieldRender = ({
	Messages,
	field,
	transactions,
	moneeeyStore,
}: {
	Messages: TMessages;
	field: string;
	transactions: ITransaction[];
	moneeeyStore: MoneeeyStore;
}) =>
	function FieldRender(row: Row) {
		return changedRender({
			Messages,
			row,
			field,
			cell: () => (
				<>
					{
						transactions.find((t) => t.transaction_uuid === row.entityId)?.[
							field
						]
					}
				</>
			),
			moneeeyStore,
			transactions,
		});
	};

const ContentTransactionTable = ({
	Messages,
	moneeeyStore,
	transactions,
	task,
	result,
}: {
	Messages: TMessages;
	moneeeyStore: MoneeeyStore;
	transactions: ITransaction[];
	task: ImportTask;
	result: ImportResult;
}) =>
	isEmpty(transactions) ? null : (
		<VirtualTable
			testId="contentTransactionTable"
			rows={transactions.map((t) => ({ entityId: t.transaction_uuid }))}
			columns={[
				{
					index: 0,
					width: 100,
					title: Messages.util.date,
					render: fieldRender({
						field: "date",
						transactions,
						moneeeyStore,
						Messages,
					}),
				},
				{
					index: 1,
					width: 200,
					title: Messages.transactions.from_account,
					render: accountRender({
						Messages,
						moneeeyStore,
						referenceAccount: task.config.referenceAccount,
						field: "from_account",
						transactions,
						result,
						setResult,
					}),
				},
				{
					index: 2,
					width: 200,
					title: Messages.transactions.to_account,
					render: accountRender({
						Messages,
						moneeeyStore,
						referenceAccount: task.config.referenceAccount,
						transactions,
						field: "to_account",
						result,
						setResult,
					}),
				},
				{
					index: 3,
					width: 120,
					title: Messages.transactions.amount,
					render: fieldRender({
						field: "from_value",
						transactions,
						moneeeyStore,
						Messages,
					}),
				},
				{
					width: 300,
					index: 5,
					title: Messages.transactions.memo,
					render: fieldRender({
						field: "memo",
						transactions,
						moneeeyStore,
						Messages,
					}),
				},
			]}
		/>
	);
*/

const ImportProcessResult = ({
	task,
	result,
	close,
}: {
	task: ImportTask;
	result: ImportResult;
	close: () => void;
}) => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const localTransactions = useMemo(() => {
		const ls = new TransactionStore(moneeeyStore);
		for (const t of result.transactions) {
			ls.merge(t);
		}
		return ls;
	}, [moneeeyStore, result]);
	const { currencies, accounts } = moneeeyStore;

	const onImport = () => {
		for (const t of localTransactions.all) {
			moneeeyStore.transactions.merge(t);
		}
		close();
	};

	const onInvertFromTo = () => {
		for (const t of localTransactions.all) {
			const { from_account, to_account } = t;

			return localTransactions.merge({
				...t,
				from_account: to_account,
				to_account: from_account,
			});
		}
	};

	const readAccountOptionsForTransaction = (t: ITransaction) =>
		compact([
			...map(
				result?.recommended_accounts[t.transaction_uuid],
				(cur_account_uuid) => moneeeyStore.accounts.byUuid(cur_account_uuid),
			),
			...moneeeyStore.accounts.allActive,
		]);

	return (
		<VerticalSpace className="h-full grow">
			{map(result.errors, (err) => (
				<p>
					<TextDanger key={err.description}>
						{err.data} {err.description}
					</TextDanger>
				</p>
			))}
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
				<SecondaryButton onClick={close}>
					{Messages.util.cancel}
				</SecondaryButton>
			</Space>
			<div className="static flex-1">
				<TableEditor
					key={"importResultTransactions"}
					testId={"importResultTransactions"}
					creatable={false}
					store={localTransactions}
					schemaFilter={() => true}
					factory={localTransactions.factory}
					schema={[
						{
							title: Messages.util.date,
							width: 100,
							defaultSortOrder: "ascend",
							readOnly: true,
							validate: () => ({ valid: true }),
							...DateField<ITransaction>({
								read: ({ date }) => date,
								delta: () => ({}),
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
								readOptions: readAccountOptionsForTransaction,
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
								readOptions: readAccountOptionsForTransaction,
							}),
						},
						{
							title: Messages.transactions.amount,
							width: 140,
							readOnly: true,
							validate: () => ({ valid: true }),
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
							...MemoField<ITransaction>({
								read: ({ memo }) => memo,
								delta: () => ({}),
							}),
						},
					]}
				/>
			</div>
		</VerticalSpace>
	);
};

export default ImportProcessResult;
