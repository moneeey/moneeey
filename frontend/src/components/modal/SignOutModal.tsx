import { observer } from "mobx-react-lite";
import { useState } from "react";

import { NavigationModal } from "../../shared/Navigation";
import { signOut } from "../../shared/signOut";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import { DeleteButton, SecondaryButton } from "../base/Button";
import Modal from "../base/Modal";
import Space, { VerticalSpace } from "../base/Space";

const SignOutModal = observer(() => {
	const Messages = useMessages();
	const { navigation, persistence } = useMoneeeyStore();
	const [busy, setBusy] = useState(false);

	const onConfirm = async () => {
		setBusy(true);
		await signOut({ flush: () => persistence.flush() });
	};

	return (
		<Modal
			modalId={NavigationModal.SIGN_OUT}
			title={Messages.menu.signout_title}
			onClose={() => {
				if (busy) return;
				navigation.closeModal();
			}}
			footer={
				<Space>
					<SecondaryButton
						testId="signout-cancel"
						onClick={() => navigation.closeModal()}
						title={Messages.util.cancel}
						disabled={busy}
					/>
					<DeleteButton
						testId="signout-confirm"
						onClick={onConfirm}
						disabled={busy}
					>
						{busy ? Messages.menu.signout_in_progress : Messages.menu.signout}
					</DeleteButton>
				</Space>
			}
		>
			<VerticalSpace>
				<p className="text-sm">{Messages.menu.signout_body}</p>
				<p className="text-sm font-semibold text-danger-300">
					{Messages.menu.signout_warning}
				</p>
			</VerticalSpace>
		</Modal>
	);
});

export default SignOutModal;
