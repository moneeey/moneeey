import { useState } from "react";

import Loading from "../components/Loading";
import { PrimaryButton, SecondaryButton } from "../components/base/Button";
import Drawer from "../components/base/Drawer";
import { TextArea } from "../components/base/Input";
import Space, { VerticalSpace } from "../components/base/Space";
import {
	MIN_PASSPHRASE_LENGTH,
	verifyPassphrase,
} from "../shared/EncryptionStore";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import ConfigTable from "../tables/ConfigTable";
import useMessages from "../utils/Messages";
import { noop } from "../utils/Utils";

type Action = {
	title: string;
	content: string;
	submitTitle?: string;
	submitFn?: (data: Action) => void;
};

export default function Settings() {
	const Messages = useMessages();
	const [action, setAction] = useState<Action | undefined>(undefined);
	const [loading, setLoading] = useState<number | false>(false);
	const [changingPassphrase, setChangingPassphrase] = useState(false);
	const [currentPassphrase, setCurrentPassphrase] = useState("");
	const [newPassphrase, setNewPassphrase] = useState("");
	const [confirmPassphrase, setConfirmPassphrase] = useState("");
	const [passphraseError, setPassphraseError] = useState<string | null>(null);
	const [passphraseBusy, setPassphraseBusy] = useState(false);
	const moneeeyStore = useMoneeeyStore();

	const onExportData = async () => {
		const update = (newContent: string) =>
			setAction({
				title: Messages.settings.export_data,
				content: newContent,
			});
		update(Messages.settings.backup_loading(0));
		const data = await moneeeyStore.persistence.exportAll((percentage) => {
			update(Messages.settings.backup_loading(percentage));
			setLoading(percentage);
		});
		setLoading(false);
		update(data);
	};
	const onImportData = () => {
		const update = (newContent: string) =>
			setAction({
				title: Messages.settings.import_data,
				content: newContent,
				submitTitle: Messages.util.close,
				submitFn: noop,
			});
		const submitFn = async (data: Action) => {
			const input = data?.content || "";
			update(Messages.settings.restore_loading(0));
			await moneeeyStore.persistence.restoreAll(input, (percentage) => {
				update(Messages.settings.restore_loading(percentage));
				setLoading(percentage);
			});
			setLoading(false);
			update(Messages.settings.reload_page);
		};
		setAction({
			content: Messages.settings.restore_data_placeholder,
			title: Messages.settings.import_data,
			submitFn,
			submitTitle: Messages.settings.import_data,
		});
	};

	const onClearData = () => {
		setAction({
			title: Messages.settings.clear_all,
			content: Messages.settings.clear_data_placeholder,
			submitTitle: Messages.settings.clear_all,
			submitFn: (data) => {
				if (data && data.content === Messages.settings.clear_data_token) {
					moneeeyStore.persistence.truncateAll();
					setAction({ ...data, content: Messages.settings.reload_page });
				}
			},
		});
	};

	const onChangePassphrase = () => {
		setCurrentPassphrase("");
		setNewPassphrase("");
		setConfirmPassphrase("");
		setPassphraseError(null);
		setChangingPassphrase(true);
	};

	const onSubmitPassphraseChange = async () => {
		if (currentPassphrase.length === 0) {
			setPassphraseError(Messages.encryption.wrong_passphrase);
			return;
		}
		if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
			setPassphraseError(Messages.encryption.passphrase_too_short);
			return;
		}
		if (newPassphrase !== confirmPassphrase) {
			setPassphraseError(Messages.encryption.passphrase_mismatch);
			return;
		}
		setPassphraseError(null);
		setPassphraseBusy(true);
		try {
			const db = moneeeyStore.persistence.getDb();
			const dataKey = await verifyPassphrase(db, currentPassphrase);
			await moneeeyStore.encryption.changePassphrase(
				db,
				dataKey,
				newPassphrase,
			);
			// changePassphrase triggers a reload; this line is unreachable.
		} catch (err) {
			const code = (err as Error).message;
			if (code === "passphrase_too_short") {
				setPassphraseError(Messages.encryption.passphrase_too_short);
			} else {
				setPassphraseError(Messages.encryption.wrong_passphrase);
			}
			setPassphraseBusy(false);
		}
	};

	return (
		<>
			<Space className="p-2 scale-75">
				<PrimaryButton onClick={onExportData}>
					{Messages.settings.export_data}
				</PrimaryButton>
				<SecondaryButton onClick={onImportData}>
					{Messages.settings.import_data}
				</SecondaryButton>
				<SecondaryButton onClick={onClearData}>
					{Messages.settings.clear_all}
				</SecondaryButton>
				<SecondaryButton onClick={onChangePassphrase}>
					{Messages.menu.change_passphrase}
				</SecondaryButton>
			</Space>
			<VerticalSpace>
				{changingPassphrase && (
					<Drawer
						testId="changePassphraseDrawer"
						header={Messages.encryption.change_title}
						footer={
							<Space>
								<SecondaryButton
									onClick={() => setChangingPassphrase(false)}
									title={Messages.util.close}
									disabled={passphraseBusy}
								/>
								<PrimaryButton
									onClick={onSubmitPassphraseChange}
									title={Messages.encryption.change_submit}
									disabled={passphraseBusy}
								/>
							</Space>
						}
					>
						<div className="bg-background-900 p-2 flex flex-col gap-3">
							<p className="text-sm opacity-80">
								{Messages.encryption.change_description}
							</p>
							<input
								data-testid="currentPassphrase"
								type="password"
								autoComplete="current-password"
								placeholder={Messages.encryption.current_passphrase_placeholder}
								value={currentPassphrase}
								disabled={passphraseBusy}
								onChange={(event) => {
									setCurrentPassphrase(event.target.value);
									setPassphraseError(null);
								}}
								className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
							/>
							<input
								data-testid="newPassphrase"
								type="password"
								autoComplete="new-password"
								placeholder={Messages.encryption.new_passphrase_placeholder}
								value={newPassphrase}
								disabled={passphraseBusy}
								onChange={(event) => {
									setNewPassphrase(event.target.value);
									setPassphraseError(null);
								}}
								className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
							/>
							<input
								data-testid="newPassphraseConfirm"
								type="password"
								autoComplete="new-password"
								placeholder={Messages.encryption.confirm_placeholder}
								value={confirmPassphrase}
								disabled={passphraseBusy}
								onChange={(event) => {
									setConfirmPassphrase(event.target.value);
									setPassphraseError(null);
								}}
								className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
							/>
							{passphraseError && (
								<p
									className="text-sm text-danger-300"
									data-testid="changePassphraseError"
								>
									{passphraseError}
								</p>
							)}
						</div>
					</Drawer>
				)}
				{action && (
					<Drawer
						testId="accountSettings"
						header={action.title}
						footer={
							<Space>
								<SecondaryButton
									onClick={() => setAction(undefined)}
									title={Messages.util.close}
								/>
								{action.submitFn && (
									<PrimaryButton
										onClick={() => action.submitFn?.(action)}
										title={action.submitTitle}
									/>
								)}
							</Space>
						}
					>
						<div className="bg-background-900 p-2">
							<Loading progress={loading || 0} loading={Boolean(loading)}>
								<TextArea
									testId="importExportOutput"
									value={action.content}
									onChange={(value) =>
										setAction((cont) => cont && { ...cont, content: value })
									}
									placeholder={"Data"}
									rows={16}
								/>
							</Loading>
						</div>
					</Drawer>
				)}
				<ConfigTable config={moneeeyStore.config} />
			</VerticalSpace>
		</>
	);
}
