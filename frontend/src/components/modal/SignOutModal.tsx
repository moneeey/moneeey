import { observer } from "mobx-react-lite";
import { useState } from "react";

import { NavigationModal } from "../../shared/Navigation";
import { signOut } from "../../shared/signOut";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import SignOutConfirm from "../SignOutConfirm";

const SignOutModal = observer(() => {
	const { navigation, persistence } = useMoneeeyStore();
	const [busy, setBusy] = useState(false);

	if (navigation.modal !== NavigationModal.SIGN_OUT) return null;

	const onConfirm = async () => {
		setBusy(true);
		await signOut({ flush: () => persistence.flush() });
	};

	return (
		<div className="fixed inset-0 z-50 bg-background-600">
			<SignOutConfirm
				busy={busy}
				onCancel={() => {
					if (busy) return;
					navigation.closeModal();
				}}
				onConfirm={onConfirm}
			/>
		</div>
	);
});

export default SignOutModal;
