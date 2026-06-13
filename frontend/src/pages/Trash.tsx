import { observer } from "mobx-react-lite";

import TableEditor, { type CompactLayout } from "../components/TableEditor";
import { SecondaryButton } from "../components/base/Button";
import AccountField from "../components/editor/AccountField";
import CurrencyAmountField from "../components/editor/CurrencyAmountField";
import DateField from "../components/editor/DateField";
import type { FieldDef } from "../components/editor/FieldDef";
import MemoField from "../components/editor/MemoField";
import type { ITransaction } from "../entities/Transaction";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

const Trash = observer(() => {
	const Messages = useMessages();
	const { accounts, currencies, transactions } = useMoneeeyStore();
	const rows = transactions.trash;

	const restoreField: FieldDef<ITransaction> = {
		title: Messages.util.actions,
		width: 80,
		validate: () => ({ valid: true }),
		sorter: () => 0,
		render: ({ entity }) => (
			<SecondaryButton
				compact
				testId="transactionRestore"
				className="text-xs"
				onClick={() => transactions.restoreTransaction(entity)}
			>
				{Messages.util.restore}
			</SecondaryButton>
		),
	};

	const schema: FieldDef<ITransaction>[] = [
		{
			title: Messages.util.date,
			width: 70,
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
			readOnly: true,
			validate: () => ({ valid: true }),
			...AccountField<ITransaction>({
				read: ({ from_account }) => from_account,
				delta: () => ({}),
				clearable: false,
				readOptions: () => accounts.allActive,
			}),
		},
		{
			title: Messages.transactions.to_account,
			width: 140,
			readOnly: true,
			validate: () => ({ valid: true }),
			...AccountField<ITransaction>({
				read: ({ to_account }) => to_account,
				delta: () => ({}),
				clearable: false,
				readOptions: () => accounts.allActive,
			}),
		},
		{
			title: Messages.transactions.amount,
			width: 120,
			readOnly: true,
			validate: () => ({ valid: true }),
			...CurrencyAmountField<ITransaction>({
				read: ({ from_account, from_value }) => ({
					currency: currencies.byUuid(
						accounts.byUuid(from_account)?.currency_uuid || "",
					),
					amount: from_value,
				}),
				delta: () => ({}),
			}),
		},
		{
			title: Messages.transactions.memo,
			width: 220,
			readOnly: true,
			validate: () => ({ valid: true }),
			...MemoField<ITransaction>({
				read: ({ memo }) => memo,
				delta: () => ({}),
			}),
		},
		restoreField,
	];

	const compactLayout: CompactLayout = [
		[
			{ title: Messages.util.date, muted: true },
			{ title: Messages.transactions.memo, flex: 2 },
		],
		[
			{ title: Messages.transactions.from_account, flex: 2 },
			{ title: Messages.transactions.to_account, flex: 2 },
			{ title: Messages.transactions.amount, align: "right" },
		],
		[{ title: Messages.util.actions }],
	];

	return (
		<section className="flex grow flex-col gap-3 bg-background-800 p-2 md:p-4">
			<h2 className="text-lg font-semibold">
				{Messages.menu.trash(rows.length)}
			</h2>
			{rows.length === 0 ? (
				<section
					data-testid="trashEmpty"
					className="flex min-h-[18em] items-center justify-center text-foreground/60"
				>
					{Messages.reports.no_data}
				</section>
			) : (
				<div className="min-h-0 grow" data-testid="trashTable">
					<TableEditor
						testId="trashTable"
						creatable={false}
						store={transactions}
						rows={rows}
						schemaFilter={() => true}
						factory={transactions.factory}
						compactLayout={compactLayout}
						schema={schema}
					/>
				</div>
			)}
		</section>
	);
});

export default Trash;
