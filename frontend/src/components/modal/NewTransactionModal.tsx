import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { AccountKind } from "../../entities/Account";
import { NavigationModal } from "../../shared/Navigation";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { currentDate, formatDate, parseDateOrTime } from "../../utils/Date";
import useMessages from "../../utils/Messages";
import { CancelButton, PrimaryButton } from "../base/Button";
import DatePicker from "../base/DatePicker";
import { Checkbox, Input, InputNumber } from "../base/Input";
import Modal from "../base/Modal";
import Select from "../base/Select";

const NewTransactionModal = observer(() => {
	const Messages = useMessages();
	const { navigation, accounts, transactions, currencies, config } =
		useMoneeeyStore();

	const isOpen = navigation.modal === NavigationModal.NEW_TRANSACTION;

	const defaultFromAccountId = accounts.allNonPayees[0]?.id || "";
	const [amount, setAmount] = useState<number>(0);
	const [fromAccount, setFromAccount] = useState(defaultFromAccountId);
	const [toAccount, setToAccount] = useState("");
	const [date, setDate] = useState(currentDate());
	const [memo, setMemo] = useState("");
	const [saveAndAnother, setSaveAndAnother] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!fromAccount && defaultFromAccountId) {
			setFromAccount(defaultFromAccountId);
		}
	}, [fromAccount, defaultFromAccountId]);

	if (!isOpen) return null;

	const fromAccountEntity = accounts.byUuid(fromAccount);
	const currency =
		currencies.byUuid(fromAccountEntity?.currency_uuid) ||
		currencies.byUuid(config.main.default_currency);

	const fromOptions = accounts.allNonPayees
		.filter((a) => !a.archived)
		.map((a) => ({
			value: a.id,
			label: a.name,
		}));

	const toOptions = [
		...accounts.allPayees
			.filter((a) => !a.archived)
			.map((a) => ({
				value: a.id,
				label: a.name,
			})),
		...accounts.allNonPayees
			.filter((a) => !a.archived && a.id !== fromAccount)
			.map((a) => ({
				value: a.id,
				label: a.name,
			})),
	];
	if (toAccount && !toOptions.some((opt) => opt.value === toAccount)) {
		toOptions.unshift({ value: toAccount, label: toAccount });
	}

	const handleSubmit = () => {
		if (!amount || amount <= 0) {
			setError(Messages.transactions.amount);
			return;
		}
		if (!fromAccount) {
			setError(Messages.transactions.from_account);
			return;
		}
		if (!toAccount.trim()) {
			setError(Messages.transactions.to_account);
			return;
		}

		let toUuid = toAccount;
		const existing = accounts.byUuid(toUuid) || accounts.byName(toUuid);
		if (existing) {
			toUuid = existing.id;
		} else if (toUuid.trim()) {
			const newPayee = accounts.factory();
			newPayee.name = toUuid.trim();
			newPayee.kind = AccountKind.PAYEE;
			accounts.merge(newPayee);
			toUuid = newPayee.id;
		}

		const tx = transactions.factory();
		tx.date = date;
		tx.from_account = fromAccount;
		tx.to_account = toUuid;
		tx.from_value = Math.abs(amount);
		tx.to_value = Math.abs(amount);
		tx.memo = memo.trim();
		transactions.merge(tx);

		if (saveAndAnother) {
			setAmount(0);
			setToAccount("");
			setMemo("");
			setError(null);
		} else {
			navigation.closeModal();
		}
	};

	return (
		<Modal
			modalId={NavigationModal.NEW_TRANSACTION}
			title={Messages.dashboard.new_transaction}
			onClose={() => navigation.closeModal()}
			footer={
				<div className="flex items-center justify-between w-full pt-3">
					<Checkbox
						testId="newTxSaveAnother"
						value={saveAndAnother}
						onChange={setSaveAndAnother}
					>
						<span className="text-xs text-muted">
							{Messages.transactions.save_and_add_another}
						</span>
					</Checkbox>
					<div className="flex items-center gap-2">
						<CancelButton
							testId="newTxCancel"
							onClick={() => navigation.closeModal()}
						/>
						<PrimaryButton testId="newTxSubmit" onClick={handleSubmit}>
							{Messages.util.save}
						</PrimaryButton>
					</div>
				</div>
			}
		>
			<div
				data-testid="newTransactionModal"
				className="flex flex-col gap-4 min-w-[20rem] md:min-w-[24rem]"
			>
				{error && (
					<div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 font-medium">
						{error}
					</div>
				)}

				<div className="flex flex-col gap-1">
					<label
						htmlFor="newTxAmount"
						className="text-xs font-medium text-muted uppercase tracking-wider"
					>
						{Messages.transactions.amount}
					</label>
					<InputNumber
						testId="newTxAmount"
						value={amount}
						onChange={(val) => {
							setAmount(val);
							setError(null);
						}}
						placeholder="0.00"
						prefix={currency?.prefix}
						suffix={currency?.suffix}
						thousandSeparator={config.main.thousand_separator}
						decimalSeparator={config.main.decimal_separator}
						decimalScale={currency?.decimals || 2}
						containerArea
						autoFocus
						immediate
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="newTxFrom"
							className="text-xs font-medium text-muted uppercase tracking-wider"
						>
							{Messages.transactions.from_account}
						</label>
						<Select
							testId="newTxFrom"
							options={fromOptions}
							value={fromAccount}
							onChange={setFromAccount}
							placeholder={Messages.transactions.from_account}
							containerArea
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label
							htmlFor="newTxTo"
							className="text-xs font-medium text-muted uppercase tracking-wider"
						>
							{Messages.transactions.to_account}
						</label>
						<Select
							testId="newTxTo"
							options={toOptions}
							value={toAccount}
							onChange={setToAccount}
							onCreate={(name) => setToAccount(name)}
							createLabel={Messages.util.add}
							placeholder={Messages.transactions.to_account}
							containerArea
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="newTxDate"
							className="text-xs font-medium text-muted uppercase tracking-wider"
						>
							{Messages.util.date}
						</label>
						<DatePicker
							testId="newTxDate"
							value={parseDateOrTime(date)}
							onChange={(d) => setDate(formatDate(d))}
							dateFormat={config.main.date_format}
							placeholder={config.main.date_format}
							containerArea
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label
							htmlFor="newTxMemo"
							className="text-xs font-medium text-muted uppercase tracking-wider"
						>
							{Messages.transactions.memo}
						</label>
						<Input
							testId="newTxMemo"
							value={memo}
							onChange={setMemo}
							placeholder={Messages.transactions.memo}
							containerArea
						/>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default NewTransactionModal;
