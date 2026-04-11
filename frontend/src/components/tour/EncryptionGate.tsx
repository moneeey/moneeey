import { useState } from "react";

import {
	ENCRYPTION_INITIALIZED_KEY,
	MIN_PASSPHRASE_LENGTH,
	openEncryptedDatabase,
} from "../../shared/EncryptionStore";
import useMessages from "../../utils/Messages";
import { StorageKind, getStorage, setStorage } from "../../utils/Utils";
import { OkButton } from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";

type Props = {
	onUnlocked: (db: PouchDB.Database) => void;
};

type Mode = "setup" | "unlock";

const detectMode = (): Mode => {
	return getStorage(ENCRYPTION_INITIALIZED_KEY, "", StorageKind.PERMANENT) ===
		"1"
		? "unlock"
		: "setup";
};

export default function EncryptionGate({ onUnlocked }: Props) {
	const Messages = useMessages();
	const [mode] = useState<Mode>(detectMode);
	const [passphrase, setPassphrase] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const isSetup = mode === "setup";

	const validateLocal = (): string | null => {
		if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
			return Messages.encryption.passphrase_too_short;
		}
		if (isSetup && passphrase !== confirm) {
			return Messages.encryption.passphrase_mismatch;
		}
		return null;
	};

	const onSubmit = async () => {
		const localError = validateLocal();
		if (localError) {
			setError(localError);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const db = await openEncryptedDatabase(passphrase, mode);
			if (isSetup) {
				setStorage(ENCRYPTION_INITIALIZED_KEY, "1", StorageKind.PERMANENT);
			}
			onUnlocked(db);
		} catch (err) {
			const code = (err as Error).message;
			if (code === "passphrase_too_short") {
				setError(Messages.encryption.passphrase_too_short);
			} else {
				setError(Messages.encryption.wrong_passphrase);
			}
			setBusy(false);
		}
	};

	return (
		<MinimalBasicScreen>
			<h2 className="text-xl font-semibold">
				{isSetup
					? Messages.encryption.setup_title
					: Messages.encryption.unlock_title}
			</h2>
			<p className="text-sm opacity-80">
				{isSetup
					? Messages.encryption.setup_description
					: Messages.encryption.unlock_description}
			</p>
			{isSetup && (
				<p className="text-sm font-semibold text-danger-300">
					{Messages.encryption.setup_warning}
				</p>
			)}
			<div className="flex flex-col gap-3 w-full max-w-sm">
				<input
					data-testid="encryptionPassphrase"
					type="password"
					autoComplete={isSetup ? "new-password" : "current-password"}
					placeholder={Messages.encryption.passphrase_placeholder}
					value={passphrase}
					disabled={busy}
					onChange={(event) => setPassphrase(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !isSetup) onSubmit();
					}}
					className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
				/>
				{isSetup && (
					<input
						data-testid="encryptionPassphraseConfirm"
						type="password"
						autoComplete="new-password"
						placeholder={Messages.encryption.confirm_placeholder}
						value={confirm}
						disabled={busy}
						onChange={(event) => setConfirm(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") onSubmit();
						}}
						className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
					/>
				)}
			</div>
			{error && (
				<p className="text-sm text-danger-300" data-testid="encryptionError">
					{error}
				</p>
			)}
			{busy && (
				<p className="text-sm opacity-80">{Messages.encryption.unlocking}</p>
			)}
			<OkButton
				disabled={busy || passphrase.length === 0}
				onClick={onSubmit}
				title={
					isSetup
						? Messages.encryption.setup_submit
						: Messages.encryption.unlock_submit
				}
			/>
			{isSetup && (
				<p className="text-xs opacity-60 max-w-md">
					{Messages.encryption.upgrade_hint}
				</p>
			)}
		</MinimalBasicScreen>
	);
}
