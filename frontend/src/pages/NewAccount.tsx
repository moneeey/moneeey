import { useState } from "react";
import { CancelButton, OkCancel } from "../components/base/Button";
import { Input } from "../components/base/Input";
import AccountKindField from "../components/editor/AccountKindField";
import CurrencyAmountField from "../components/editor/CurrencyAmountField";
import CurrencySelectorField from "../components/editor/CurrencySelectorField";
import { AccountKind } from "../entities/Account";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";
import { uuid } from "../utils/Utils";

export default function NewAccount() {
	const Messages = useMessages();
	const { config, currencies, navigation, accounts, transactions } =
		useMoneeeyStore();

	const initialState = {
		uuid: uuid(),
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
		const initialAccountForCurrencyId = `INITIAL_ACCOUNT_${state.currency}`;
		if (!accounts.byUuid(initialAccountForCurrencyId)) {
			accounts.merge({
				...accounts.factory(initialAccountForCurrencyId),
				name: `${Messages.new_account.initial_balance} ${
					currencies.byUuid(state.currency)?.short
				}`,
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

	const onClose = () => navigation.closeModal();
	const onSubmitClose = () => {
		onSubmit();
		onClose();
	};

	const onSubmitAnother = () => {
		onSubmit();
		setState({ ...initialState, uuid: uuid() });
	};

	const isValid = state.name.length > 1;
	const canClose = accounts.all.length > 0;

	return (
		<div key={state.uuid} className="flex flex-col gap-4">
			<div>
				<p>{Messages.new_account.name}</p>
				<Input
          containerArea
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
          containerArea
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
          containerArea
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
          containerArea
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
			<div className="flex flex-row items-center gap-4">
					<CancelButton disabled={!canClose} title={Messages.util.close} onClick={onClose} />
					<OkCancel
            okDisabled={!isValid}
            cancelDisabled={!isValid}
						okTitle={Messages.new_account.submit_close}
						onOk={onSubmitClose}
						cancelTitle={Messages.new_account.submit_another}
						onCancel={onSubmitAnother}
					/>
			</div>
		</div>
	);
}
