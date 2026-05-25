import useMessages from "../utils/Messages";
import { CancelButton, DeleteButton } from "./base/Button";
import MinimalBasicScreen from "./base/MinimalBaseScreen";

type Props = {
	busy: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};

export default function SignOutConfirm({ busy, onCancel, onConfirm }: Props) {
	const Messages = useMessages();
	return (
		<MinimalBasicScreen>
			<h2 className="text-xl font-semibold text-danger-300">
				{Messages.menu.signout_title}
			</h2>
			<p className="text-sm opacity-80">{Messages.menu.signout_body}</p>
			<p className="text-sm font-semibold text-danger-300">
				{Messages.menu.signout_warning}
			</p>
			{busy && (
				<p className="text-sm opacity-80">
					{Messages.menu.signout_in_progress}
				</p>
			)}
			<div className="flex gap-2">
				<CancelButton
					testId="signout-cancel"
					onClick={onCancel}
					disabled={busy}
				/>
				<DeleteButton
					testId="signout-confirm"
					disabled={busy}
					onClick={onConfirm}
				>
					{busy ? Messages.menu.signout_in_progress : Messages.menu.signout}
				</DeleteButton>
			</div>
		</MinimalBasicScreen>
	);
}
