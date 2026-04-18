import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import LanguageSelector from "../components/LanguageSelector";
import Loading from "../components/Loading";
import ThemeSwitcher from "../components/ThemeSwitcher";
import {
	DeleteButton,
	PrimaryButton,
	SecondaryButton,
} from "../components/base/Button";
import { Input, TextArea } from "../components/base/Input";
import MinimalBasicScreen from "../components/base/MinimalBaseScreen";
import Space from "../components/base/Space";
import Tabs from "../components/base/Tabs";
import {
	MIN_PASSPHRASE_LENGTH,
	verifyPassphrase,
} from "../shared/EncryptionStore";
import { NavigationModal } from "../shared/Navigation";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import ConfigTable from "../tables/ConfigTable";
import useMessages from "../utils/Messages";
import { noop } from "../utils/Utils";
import { DatabaseConfig, MoneeeyAccountConfig } from "./Sync";

type ActionState = {
	content: string;
	submitTitle?: string;
	submitFn?: (content: string) => void;
};

function ProfileTab() {
	const Messages = useMessages();
	const { persistence, navigation } = useMoneeeyStore();
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [action, setAction] = useState<ActionState | undefined>(undefined);
	const [loading, setLoading] = useState<number | false>(false);

	const onExportData = async () => {
		setAction(undefined);
		const update = (newContent: string) => setAction({ content: newContent });
		update(Messages.settings.backup_loading(0));
		const data = await persistence.exportAll((percentage) => {
			update(Messages.settings.backup_loading(percentage));
			setLoading(percentage);
		});
		setLoading(false);
		update(data);
	};

	const onImportData = () => {
		setAction(undefined);
		const submitFn = async (content: string) => {
			const update = (newContent: string) =>
				setAction({
					content: newContent,
					submitTitle: Messages.util.close,
					submitFn: noop,
				});
			update(Messages.settings.restore_loading(0));
			await persistence.restoreAll(content, (percentage) => {
				update(Messages.settings.restore_loading(percentage));
				setLoading(percentage);
			});
			setLoading(false);
			update(Messages.settings.reload_page);
		};
		setAction({
			content: Messages.settings.restore_data_placeholder,
			submitFn,
			submitTitle: Messages.settings.import_data,
		});
	};

	if (confirmingDelete) {
		return (
			<div className="fixed inset-0 z-50">
				<MinimalBasicScreen>
					<h2 className="text-xl font-semibold text-danger-300">
						{Messages.menu.delete_data}
					</h2>
					<p className="text-sm opacity-80">
						{Messages.menu.delete_data_confirm}
					</p>
					<Space>
						<SecondaryButton onClick={() => setConfirmingDelete(false)}>
							{Messages.util.cancel}
						</SecondaryButton>
						<PrimaryButton
							onClick={() => {
								persistence.truncateAll();
							}}
							className="!bg-danger-300 !text-danger-900"
						>
							<TrashIcon className="inline-block h-4 w-4 mr-1 align-text-bottom" />
							{Messages.menu.delete_data}
						</PrimaryButton>
					</Space>
				</MinimalBasicScreen>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-2">
			<LanguageSelector />
			<ThemeSwitcher />
			<div className="flex flex-col justify-center items-center gap-2">
				<p>{Messages.menu.start_tour_description}</p>
				<PrimaryButton
					onClick={() => navigation.openModal(NavigationModal.LANDING)}
					title={Messages.menu.start_tour}
				/>
			</div>
			<hr className="border-background-600" />
			<span className="white-space-preline">{Messages.sync.intro}</span>
			<Tabs
				testId="syncSettings"
				items={[
					{
						key: "moneeeyAccount",
						label: Messages.sync.moneeey_sync,
						children: <MoneeeyAccountConfig />,
					},
					{
						key: "database",
						label: Messages.sync.database_sync,
						children: <DatabaseConfig />,
					},
				]}
			/>
			<hr className="border-background-600" />
			<Space>
				<PrimaryButton onClick={onExportData}>
					{Messages.settings.export_data}
				</PrimaryButton>
				<SecondaryButton onClick={onImportData}>
					{Messages.settings.import_data}
				</SecondaryButton>
				<DeleteButton onClick={() => setConfirmingDelete(true)}>
					<TrashIcon className="inline-block h-4 w-4 mr-1 align-text-bottom" />
					{Messages.menu.delete_data}
				</DeleteButton>
			</Space>
			{action && (
				<div className="flex flex-col gap-2">
					<Loading progress={loading || 0} loading={Boolean(loading)}>
						<TextArea
							testId="importExportOutput"
							value={action.content}
							onChange={(value) =>
								setAction((prev) => prev && { ...prev, content: value })
							}
							placeholder={"Data"}
							rows={16}
							containerArea
						/>
					</Loading>
					<Space>
						<SecondaryButton
							onClick={() => setAction(undefined)}
							title={Messages.util.close}
						/>
						{action.submitFn && (
							<PrimaryButton
								onClick={() => action.submitFn?.(action.content)}
								title={action.submitTitle}
							/>
						)}
					</Space>
				</div>
			)}
		</div>
	);
}

function PreferencesTab() {
	const moneeeyStore = useMoneeeyStore();
	return <ConfigTable config={moneeeyStore.config} />;
}

function PassphraseTab() {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const [currentPassphrase, setCurrentPassphrase] = useState("");
	const [newPassphrase, setNewPassphrase] = useState("");
	const [confirmPassphrase, setConfirmPassphrase] = useState("");
	const [passphraseError, setPassphraseError] = useState<string | null>(null);
	const [passphraseBusy, setPassphraseBusy] = useState(false);

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
		<div className="flex flex-col gap-3 p-2 max-w-md">
			<p className="text-sm opacity-80">
				{Messages.encryption.change_description}
			</p>
			<Input
				testId="currentPassphrase"
				type="password"
				autoComplete="current-password"
				placeholder={Messages.encryption.current_passphrase_placeholder}
				value={currentPassphrase}
				disabled={passphraseBusy}
				containerArea
				onChange={(value) => {
					setCurrentPassphrase(value);
					setPassphraseError(null);
				}}
			/>
			<Input
				testId="newPassphrase"
				type="password"
				autoComplete="new-password"
				placeholder={Messages.encryption.new_passphrase_placeholder}
				value={newPassphrase}
				disabled={passphraseBusy}
				containerArea
				onChange={(value) => {
					setNewPassphrase(value);
					setPassphraseError(null);
				}}
			/>
			<Input
				testId="newPassphraseConfirm"
				type="password"
				autoComplete="new-password"
				placeholder={Messages.encryption.confirm_placeholder}
				value={confirmPassphrase}
				disabled={passphraseBusy}
				containerArea
				onChange={(value) => {
					setConfirmPassphrase(value);
					setPassphraseError(null);
				}}
			/>
			{passphraseError && (
				<p
					className="text-sm text-danger-300"
					data-testid="changePassphraseError"
				>
					{passphraseError}
				</p>
			)}
			<Space>
				<PrimaryButton
					onClick={onSubmitPassphraseChange}
					title={Messages.encryption.change_submit}
					disabled={passphraseBusy}
				/>
			</Space>
		</div>
	);
}

export default function Settings() {
	const Messages = useMessages();

	return (
		<Tabs
			testId="settingsTabs"
			items={[
				{
					key: "profile",
					label: Messages.menu.profile,
					children: <ProfileTab />,
				},
				{
					key: "preferences",
					label: Messages.menu.preferences,
					children: <PreferencesTab />,
				},
				{
					key: "passphrase",
					label: Messages.menu.change_passphrase,
					children: <PassphraseTab />,
				},
			]}
		/>
	);
}
