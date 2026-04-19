import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { observer } from "mobx-react-lite";

import AccountField from "../../components/editor/AccountField";
import CurrencyAmountField from "../../components/editor/CurrencyAmountField";
import DateField from "../../components/editor/DateField";
import type {
	FieldDef,
	FieldDefHelper,
} from "../../components/editor/FieldDef";
import MemoField from "../../components/editor/MemoField";
import type { TAccountUUID } from "../../entities/Account";
import type { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import {
	currencyForAccount,
	getOtherAccount,
	getReferenceBalance,
} from "../transactionHelpers";

const makeField = <T,>(
	helper: FieldDefHelper<T>,
	title: string,
	readOnly?: boolean,
): FieldDef<T> => ({
	title,
	width: 0,
	readOnly,
	validate: () => ({ valid: true }),
	sorter: helper.sorter,
	render: helper.render,
});

const RenderField = <T,>({
	helper,
	entity,
	commit,
	title,
	readOnly,
}: {
	helper: FieldDefHelper<T>;
	entity: T;
	commit: (updated: T) => void;
	title: string;
	readOnly?: boolean;
}) => {
	const field = makeField(helper, title, readOnly);
	const withRev = entity as unknown as { _rev?: string };
	return (
		<field.render
			rev={withRev._rev || ""}
			entity={entity}
			field={field}
			isError={false}
			commit={commit}
		/>
	);
};

type Props = {
	entity: ITransaction;
	referenceAccount?: TAccountUUID;
};

const MobileTransactionRow = observer(({ entity, referenceAccount }: Props) => {
	const Messages = useMessages();
	const { accounts, currencies, config, transactions } = useMoneeeyStore();

	const commit = (updated: ITransaction) => {
		transactions.merge(updated);
	};

	const dateHelper = DateField<ITransaction>({
		read: ({ date }) => date,
		delta: (date) => ({ date }),
	});
	const memoHelper = MemoField<ITransaction>({
		read: ({ memo }) => memo,
		delta: (memo) => ({ memo }),
	});
	const fromAccountHelper = AccountField<ITransaction>({
		read: ({ from_account }) => from_account ?? "",
		delta: (from_account) => ({ from_account }),
		clearable: true,
		readOptions: () => accounts.allActive,
	});
	const toAccountHelper = AccountField<ITransaction>({
		read: ({ to_account }) => to_account ?? "",
		delta: (to_account) => ({ to_account }),
		clearable: true,
		readOptions: () => accounts.allActive,
	});
	const fromAmountHelper = CurrencyAmountField<ITransaction>({
		read: ({ from_account, from_value }) => ({
			currency: currencyForAccount(
				from_account ?? "",
				accounts,
				currencies,
				config,
			),
			amount: from_value,
		}),
		delta: ({ amount }) => ({ from_value: Math.abs(amount) }),
	});
	const toAmountHelper = CurrencyAmountField<ITransaction>({
		read: ({ to_account, to_value }) => ({
			currency: currencyForAccount(
				to_account ?? "",
				accounts,
				currencies,
				config,
			),
			amount: to_value,
		}),
		delta: ({ amount }) => ({ to_value: Math.abs(amount) }),
	});
	const balanceHelper = CurrencyAmountField<ITransaction>({
		read: ({ transaction_uuid, from_account, to_account }) => ({
			currency: currencyForAccount(
				referenceAccount ?? "",
				accounts,
				currencies,
				config,
			),
			amount: referenceAccount
				? getReferenceBalance(
						transaction_uuid,
						{ from_account, to_account, referenceAccount },
						transactions,
					)
				: 0,
		}),
		delta: () => ({}),
	});

	if (referenceAccount) {
		const isOutflow = entity.from_account === referenceAccount;
		const counterpartyUuid = getOtherAccount({
			from_account: entity.from_account,
			to_account: entity.to_account,
			referenceAccount,
		});
		const counterpartyHelper = AccountField<ITransaction>({
			read: () => counterpartyUuid,
			delta: (value) =>
				isOutflow
					? { to_account: value, from_account: referenceAccount }
					: { from_account: value, to_account: referenceAccount },
			clearable: true,
			readOptions: () => accounts.allActive,
		});
		const referenceAmountHelper = CurrencyAmountField<ITransaction>({
			read: ({ from_value, to_value }) => ({
				currency: currencyForAccount(
					referenceAccount,
					accounts,
					currencies,
					config,
				),
				amount: isOutflow ? -from_value : to_value,
			}),
			delta: ({ amount }) =>
				isOutflow
					? { from_value: Math.abs(amount) }
					: { to_value: Math.abs(amount) },
		});
		const amountColor = isOutflow ? "text-negative" : "text-positive";
		return (
			<div className="flex h-full flex-col py-1">
				<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
					<div className="min-w-0 flex-1">
						<RenderField
							helper={dateHelper}
							entity={entity}
							commit={commit}
							title={Messages.util.date}
						/>
					</div>
					<div className="min-w-0">
						<RenderField
							helper={balanceHelper}
							entity={entity}
							commit={commit}
							title={Messages.transactions.running_balance}
							readOnly
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className={`shrink-0 ${amountColor}`}>
						{isOutflow ? (
							<ArrowDownIcon className="h-4 w-4" />
						) : (
							<ArrowUpIcon className="h-4 w-4" />
						)}
					</span>
					<div className="min-w-0 flex-1">
						<RenderField
							helper={counterpartyHelper}
							entity={entity}
							commit={commit}
							title={Messages.transactions.account}
						/>
					</div>
					<div className="min-w-0 max-w-[45%] flex-1">
						<RenderField
							helper={memoHelper}
							entity={entity}
							commit={commit}
							title={Messages.transactions.memo}
						/>
					</div>
					<div className={`min-w-0 ${amountColor}`}>
						<RenderField
							helper={referenceAmountHelper}
							entity={entity}
							commit={commit}
							title={Messages.transactions.amount}
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col py-1">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<div className="min-w-0 flex-1">
					<RenderField
						helper={dateHelper}
						entity={entity}
						commit={commit}
						title={Messages.util.date}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="shrink-0 text-negative">
					<ArrowDownIcon className="h-4 w-4" />
				</span>
				<div className="min-w-0 flex-1">
					<RenderField
						helper={fromAccountHelper}
						entity={entity}
						commit={commit}
						title={Messages.transactions.from_account}
					/>
				</div>
				<div className="min-w-0 max-w-[40%] flex-1">
					<RenderField
						helper={memoHelper}
						entity={entity}
						commit={commit}
						title={Messages.transactions.memo}
					/>
				</div>
				<div className="min-w-0 text-negative">
					<RenderField
						helper={fromAmountHelper}
						entity={entity}
						commit={commit}
						title={Messages.transactions.amount}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="shrink-0 text-positive">
					<ArrowUpIcon className="h-4 w-4" />
				</span>
				<div className="min-w-0 flex-1">
					<RenderField
						helper={toAccountHelper}
						entity={entity}
						commit={commit}
						title={Messages.transactions.to_account}
					/>
				</div>
				<div className="min-w-0 text-positive">
					<RenderField
						helper={toAmountHelper}
						entity={entity}
						commit={commit}
						title={Messages.transactions.amount}
					/>
				</div>
			</div>
		</div>
	);
});

export default MobileTransactionRow;
