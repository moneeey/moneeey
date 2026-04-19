import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { isEmpty } from "lodash";
import { observer } from "mobx-react-lite";

import AccountField from "../components/editor/AccountField";
import CurrencyAmountField from "../components/editor/CurrencyAmountField";
import DateField from "../components/editor/DateField";
import { FieldVisibility } from "../components/editor/FieldDef";
import MemoField from "../components/editor/MemoField";
import TransactionAmountField from "../components/editor/TransactionAmountField";

import TableEditor, { type CompactLayout } from "../components/TableEditor";
import type { TAccountUUID } from "../entities/Account";
import type { ICurrency } from "../entities/Currency";
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
		const hasReference = !isEmpty(referenceAccount);

		const currencyForAccount = (
			account_uuid: TAccountUUID,
		): ICurrency | undefined =>
			currencies.byUuid(accounts.byUuid(account_uuid)?.currency_uuid) ??
			currencies.byUuid(config.main.default_currency);

		const getOther = <T,>({
			from,
			to,
			from_account,
			to_account,
		}: {
			from: T;
			to: T;
			from_account: TAccountUUID | null;
			to_account: TAccountUUID | null;
		}): T => {
			if (referenceAccount === to_account) return from;
			return referenceAccount === from_account ? to : from;
		};

		const getOtherAccount = ({
			to_account,
			from_account,
		}: {
			to_account: TAccountUUID | null;
			from_account: TAccountUUID | null;
		}): TAccountUUID =>
			getOther({
				from: from_account ?? "",
				to: to_account ?? "",
				from_account,
				to_account,
			});

		const getReferenceBalance = (
			transaction_uuid: string,
			{
				from_account,
				to_account,
			}: { from_account: TAccountUUID | null; to_account: TAccountUUID | null },
		) => {
			const balance =
				transactions.runningBalance.transactionRunningBalance.get(
					transaction_uuid,
				);
			if (referenceAccount === to_account) return balance?.to_balance ?? 0;
			if (referenceAccount === from_account) return balance?.from_balance ?? 0;
			return 0;
		};

		const amountRead = ({
			from_account,
			from_value,
			to_account,
			to_value,
		}: ITransaction) => ({
			from: {
				currency: currencyForAccount(from_account ?? ""),
				amount: referenceAccount === from_account ? -from_value : from_value,
			},
			to: {
				currency: currencyForAccount(to_account ?? ""),
				amount: to_value,
			},
		});

		const amountDelta = (
			{
				from,
				to,
			}: {
				from: { amount: number; currency?: ICurrency };
				to: { amount: number; currency?: ICurrency };
			},
			entity: ITransaction,
		): Partial<ITransaction> => {
			const { from_account, to_account } = entity;
			if (
				(referenceAccount === to_account && to.amount < 0) ||
				(referenceAccount === from_account && from.amount > 0)
			) {
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
		};

		const amountColorClass = ({
			from_account,
			to_account,
		}: {
			from_account: TAccountUUID | null;
			to_account: TAccountUUID | null;
		}) => {
			if (!referenceAccount) return "";
			return referenceAccount === from_account
				? "text-negative"
				: referenceAccount === to_account
					? "text-positive"
					: "";
		};

		const schema = [
			{
				title: Messages.util.date,
				width: 60,
				defaultSortOrder: "ascend" as const,
				validate: () => ({ valid: true }),
				...DateField<ITransaction>({
					read: ({ date }) => date,
					delta: (date) => ({ date }),
				}),
			},
			...(hasReference
				? [
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
										to_account: transaction.to_account,
									});
									return {
										[field]: new_account,
										[field === "from_account" ? "to_account" : "from_account"]:
											referenceAccount,
									};
								},
								clearable: true,
								readOptions: () => accounts.allActive,
							}),
						},
					]
				: [
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
				customClass: amountColorClass,
				validate: () => ({ valid: true }),
				...TransactionAmountField<ITransaction>({
					read: amountRead,
					delta: amountDelta,
				}),
			},
			...(hasReference
				? [
						{
							title: Messages.transactions.running_balance,
							width: 120,
							customClass: ({
								transaction_uuid,
								from_account,
								to_account,
							}: {
								transaction_uuid: string;
								from_account: TAccountUUID | null;
								to_account: TAccountUUID | null;
							}) => {
								const amount = getReferenceBalance(transaction_uuid, {
									from_account,
									to_account,
								});
								return amount < 0 ? "text-negative" : "text-positive";
							},
							validate: () => ({ valid: true }),
							...CurrencyAmountField<ITransaction>({
								read: ({ transaction_uuid, from_account, to_account }) => ({
									currency: currencyForAccount(referenceAccount),
									amount: getReferenceBalance(transaction_uuid, {
										from_account,
										to_account,
									}),
								}),
								delta: () => ({}),
							}),
						},
					]
				: [
						{
							title: Messages.transactions.from_amount,
							width: 120,
							visibility: FieldVisibility.OnlyOnMobile,
							customClass: () => "text-negative",
							validate: () => ({ valid: true }),
							...TransactionAmountField<ITransaction>({
								read: amountRead,
								delta: amountDelta,
								side: "from",
							}),
						},
						{
							title: Messages.transactions.to_amount,
							width: 120,
							visibility: FieldVisibility.OnlyOnMobile,
							customClass: () => "text-positive",
							validate: () => ({ valid: true }),
							...TransactionAmountField<ITransaction>({
								read: amountRead,
								delta: amountDelta,
								side: "to",
							}),
						},
					]),
			{
				title: Messages.transactions.memo,
				width: 160,
				validate: () => ({ valid: true }),
				...MemoField<ITransaction>({
					read: ({ memo }) => memo,
					delta: (memo) => ({ memo }),
				}),
			},
		];

		const arrowDown = <ArrowDownIcon className="h-4 w-4 text-negative" />;
		const arrowUp = <ArrowUpIcon className="h-4 w-4 text-positive" />;

		const compactLayout: CompactLayout = hasReference
			? [
					[
						{ title: Messages.util.date, muted: true, flex: 1 },
						{
							title: Messages.transactions.running_balance,
							muted: true,
							align: "right",
						},
					],
					[
						{ title: Messages.transactions.account, flex: 2 },
						{ title: Messages.transactions.memo, flex: 2 },
						{ title: Messages.transactions.amount, align: "right" },
					],
				]
			: [
					[{ title: Messages.util.date, muted: true }],
					[
						{
							title: Messages.transactions.from_account,
							icon: arrowDown,
							flex: 2,
						},
						{ title: Messages.transactions.from_amount, align: "right" },
					],
					[
						{
							title: Messages.transactions.to_account,
							icon: arrowUp,
							flex: 2,
						},
						{ title: Messages.transactions.to_amount, align: "right" },
					],
					[{ title: Messages.transactions.memo }],
				];

		return (
			<TableEditor
				key={tableId}
				creatable={creatable}
				testId={"transactionTable"}
				store={transactions}
				schemaFilter={schemaFilter}
				factory={transactions.factory}
				compactLayout={compactLayout}
				compactRowHeight={hasReference ? 72 : 120}
				schema={schema}
			/>
		);
	},
);
