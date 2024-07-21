import { useState } from "react";
import { Input } from "../components/base/Input";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";
import CurrencyAmountField from "../components/editor/CurrencyAmountField";
import AccountKindField from "../components/editor/AccountKindField";
import { AccountKind } from "../entities/Account";
import CurrencySelectorField from "../components/editor/CurrencySelectorField";
import { CancelButton, OkCancel } from "../components/base/Button";
import { uuid } from "../utils/Utils";

export default function NewAccount() {
	const Messages = useMessages();
	const { config, currencies, navigation, accounts, transactions } =
		useMoneeeyStore();

	const initialState = {
		name: "",
		kind: AccountKind.CHECKING,
		currency: config.main.default_currency,
		initialBalance: 0,
	};
	const [state, setState] = useState({ ...initialState });

	const InitialBalalanceEditor = CurrencyAmountField<typeof state>({
		read: ({ initialBalance, currency }) => ({
			amount: initialBalance,
			currency: currencies.byUuid(currency),
		}),
		delta: ({ amount }) => ({ initialBalance: amount }),
	}).render;

	const AccountTypeEditor = AccountKindField<typeof state>({
		read: ({ kind }) => kind,
		delta: (kind) => ({ kind }),
	}).render;

	const CurrencyEditor = CurrencySelectorField<typeof state>({
		read: ({ currency }) => currency,
		delta: (currency) => ({ currency }),
	}).render;

	const onSubmit = () => {
		const initialAccountForCurrencyId = "INITIAL_ACCOUNT_" + state.currency;
		if (!accounts.byUuid(initialAccountForCurrencyId)) {
			accounts.merge({
				...accounts.factory(initialAccountForCurrencyId),
				name:
					Messages.new_account.initial_balance +
					" " +
					currencies.byUuid(state.currency)?.short,
				kind: AccountKind.PAYEE,
				currency_uuid: state.currency,
			});
		}
		const accountId = uuid();
		accounts.merge({
			...accounts.factory(accountId),
			name: state.name,
			kind: state.kind,
			currency_uuid: state.currency,
		});
		transactions.merge({
			...transactions.factory(),
			from_account: initialAccountForCurrencyId,
			from_value: state.initialBalance,
			to_account: accountId,
			to_value: state.initialBalance,
		});
	};

	const onSubmitClose = () => {
		onSubmit();
		navigation.closeModal();
	};

	const onSubmitAnother = () => {
		onSubmit();
		setState({ ...initialState });
	};

	const isValid = state.name.length > 3;

	return (
		<div className="flex flex-col gap-4">
			<div>
				<p>{Messages.new_account.name}</p>
				<Input
					testId="name"
					placeholder={Messages.new_account.name}
					value={state.name}
					onChange={(value) =>
						setState((current) => ({ ...current, name: value }))
					}
				/>
			</div>
			<div>
				<p>{Messages.new_account.type}</p>
				<AccountTypeEditor
					rev={""}
					entity={state}
					isError={false}
					commit={({ kind }) => setState((current) => ({ ...current, kind }))}
					field={{
						title: Messages.new_account.type,
						required: true,
						width: 0,
						sorter: () => 0,
						render: () => <span>{state.kind}</span>,
						validate: () => ({ valid: true }),
					}}
				/>
			</div>
			<div>
				<p>{Messages.new_account.currency}</p>
				<CurrencyEditor
					rev={""}
					entity={state}
					isError={false}
					commit={({ currency }) =>
						setState((current) => ({ ...current, currency, initialBalance: 0 }))
					}
					field={{
						title: Messages.new_account.currency,
						required: true,
						width: 0,
						sorter: () => 0,
						render: () => <span>{state.kind}</span>,
						validate: () => ({ valid: true }),
					}}
				/>
			</div>
			<div>
				<p>{Messages.new_account.initial_balance}</p>
				<InitialBalalanceEditor
					rev={""}
					entity={state}
					isError={false}
					commit={({ initialBalance }) =>
						setState((current) => ({ ...current, initialBalance }))
					}
					field={{
						title: Messages.new_account.initial_balance,
						required: true,
						width: 0,
						sorter: () => 0,
						render: () => <span>{state.initialBalance}</span>,
						validate: () => ({ valid: true }),
					}}
				/>
			</div>
			<div>
				{isValid && (
					<OkCancel
						okTitle={Messages.new_account.submit_close}
						onOk={onSubmitClose}
						cancelTitle={Messages.new_account.submit_another}
						onCancel={onSubmitAnother}
					/>
				)}
			</div>
		</div>
	);
}
