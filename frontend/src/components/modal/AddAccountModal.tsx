import { isEmpty } from "lodash";
import NewAccount from "../../pages/NewAccount";
import { NavigationModal } from "../../shared/Navigation";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import Modal from "../base/Modal";

export default function AddAccountModal() {
	const { accounts, navigation } = useMoneeeyStore();
	const Messages = useMessages();
	return (
		<Modal
			modalId={NavigationModal.ADD_ACCOUNT}
			title={Messages.new_account.name}
			footer={<div />}
			onClose={() => {
				if (!isEmpty(accounts.all)) {
					navigation.closeModal();
				} else {
					navigation.error(Messages.tour.please_create_account);
				}
			}}
			fullScreen
		>
			<NewAccount />
		</Modal>
	);
}
