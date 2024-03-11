import { observer } from "mobx-react-lite";
import { useState } from "react";

import type { TAccountUUID } from "../../entities/Account";
import { NavigationModal } from "../../shared/Navigation";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import { OkCancel } from "../base/Button";
import Modal from "../base/Modal";
import Select from "../base/Select";
import { VerticalSpace } from "../base/Space";

export const MergeAccountsModal = observer(() => {
	const Messages = useMessages();
	const { navigation, accounts, transactions } = useMoneeeyStore();
	const [state, setState] = useState({
		source_account: "",
		target_account: "",
	});

	const mergeAccounts = (
		source_deleted: TAccountUUID,
		target_merged_into: TAccountUUID,
	) => {
		transactions.replaceAccount(source_deleted, target_merged_into);
		const account = accounts.byUuid(source_deleted);
		if (account) {
			accounts.remove(account);
		}
	};

	const onMergeAccounts = () => {
		if (state.source_account && state.target_account) {
			mergeAccounts(state.source_account, state.target_account);
			navigation.closeModal();
			setState({ source_account: "", target_account: "" });
			navigation.success(Messages.merge_accounts.success);
		}
	};

	return (
		<Modal
			modalId={NavigationModal.MERGE_ACCOUNTS}
			title={Messages.modal.merge_accounts}
			footer={
				<OkCancel
					okTitle={Messages.merge_accounts.submit}
					onOk={() => onMergeAccounts()}
					onCancel={() => navigation.closeModal()}
				/>
			}
		>
			<VerticalSpace>
				<span className="white-space-preline">
					{Messages.merge_accounts.description}
				</span>
				<Select
					testId="source_account"
					placeholder={Messages.merge_accounts.source}
					value={state.source_account}
					onChange={(source_account) => setState({ ...state, source_account })}
					options={accounts.all.map((account) => ({
						label: account.name,
						value: account.account_uuid,
					}))}
				/>
				<Select
					testId="target_account"
					placeholder={Messages.merge_accounts.target}
					value={state.target_account}
					onChange={(target_account) => setState({ ...state, target_account })}
					options={accounts.all.map((account) => ({
						label: account.name,
						value: account.account_uuid,
					}))}
				/>
			</VerticalSpace>
		</Modal>
	);
});

export default MergeAccountsModal;
