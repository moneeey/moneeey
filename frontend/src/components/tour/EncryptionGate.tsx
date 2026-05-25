import { LockOpenIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

import type { SyncConfig } from "../../entities/Config";
import {
	type EncryptionErrorCode,
	MIN_PASSPHRASE_LENGTH,
	openEncryptedDatabase,
} from "../../shared/EncryptionStore";
import {
	getInviteInfo,
	loginPasskey,
	registerPasskey,
	registerViaInvite,
} from "../../shared/encryption/bootstrapFromPasskey";
import { hasEncryptionMeta } from "../../shared/encryption/codec";
import { isWebCryptoAvailable } from "../../shared/encryption/crypto";
import type { LocalStore } from "../../shared/storage/LocalStore";
import useMessages, { type TMessages } from "../../utils/Messages";
import {
	CancelButton,
	DeleteButton,
	OkButton,
	SecondaryButton,
} from "../base/Button";
import { Input } from "../base/Input";
import MinimalBasicScreen from "../base/MinimalBaseScreen";

export type UnlockResult = {
	dataKey: CryptoKey;
	syncConfig?: SyncConfig;
};

type Props = {
	store: LocalStore;
	onUnlocked: (result: UnlockResult) => void;
};

type GateState =
	| { kind: "loading" }
	| { kind: "choose" }
	| { kind: "setup" }
	| { kind: "unlock" }
	| { kind: "passkey" }
	| { kind: "invite"; token: string }
	| { kind: "pulling"; label: string }
	| { kind: "confirm-delete"; returnTo: GateState };

const messageForError = (err: unknown, Messages: TMessages): string => {
	const code = (err as Error | undefined)?.message as
		| EncryptionErrorCode
		| undefined;
	switch (code) {
		case "passphrase_too_short":
			return Messages.encryption.passphrase_too_short;
		case "wrong_passphrase":
		case "no_meta_doc":
			return Messages.encryption.wrong_passphrase;
		case "unsupported_schema_version":
			return Messages.encryption.unsupported_schema_version;
		case "not_found_on_server":
			return Messages.encryption.no_existing_data_found;
		case "network_error":
			return Messages.encryption.network_error;
		default:
			return Messages.encryption.unknown_error;
	}
};

function parseInviteToken(): string | null {
	const hash = globalThis.location?.hash || "";
	const match = hash.match(/#\/invite\/([a-z0-9]+\.[a-f0-9]+)/);
	return match ? match[1] : null;
}

const detectInitialState = async (store: LocalStore): Promise<GateState> => {
	if (await hasEncryptionMeta(store)) {
		return { kind: "unlock" };
	}
	const inviteToken = parseInviteToken();
	if (inviteToken) {
		const info = await getInviteInfo(inviteToken);
		if (info?.valid) {
			return { kind: "invite", token: inviteToken };
		}
	}
	return { kind: "choose" };
};

export default function EncryptionGate({ store, onUnlocked }: Props) {
	const Messages = useMessages();
	const [state, setState] = useState<GateState>({ kind: "loading" });
	const [passphrase, setPassphrase] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const pendingSyncRef = useRef<SyncConfig | null>(null);
	const [displayName, setDisplayName] = useState("");

	useEffect(() => {
		let cancelled = false;
		detectInitialState(store).then((next) => {
			if (!cancelled) setState(next);
		});
		return () => {
			cancelled = true;
		};
	}, [store]);

	const reset = () => {
		setPassphrase("");
		setConfirm("");
		setError(null);
		setBusy(false);
	};

	const goChoose = () => {
		reset();
		setState({ kind: "choose" });
	};

	const goSetup = () => {
		reset();
		setState({ kind: "setup" });
	};

	const onSubmitSetup = async () => {
		if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
			setError(Messages.encryption.passphrase_too_short);
			return;
		}
		if (passphrase !== confirm) {
			setError(Messages.encryption.passphrase_mismatch);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const dataKey = await openEncryptedDatabase(store, passphrase, "setup");
			onUnlocked({ dataKey, syncConfig: pendingSyncRef.current ?? undefined });
		} catch (err) {
			setError(messageForError(err, Messages));
			setBusy(false);
		}
	};

	const onSubmitUnlock = async () => {
		if (passphrase.length === 0) {
			setError(Messages.encryption.passphrase_too_short);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const dataKey = await openEncryptedDatabase(store, passphrase, "unlock");
			onUnlocked({ dataKey, syncConfig: pendingSyncRef.current ?? undefined });
		} catch (err) {
			setError(messageForError(err, Messages));
			setBusy(false);
		}
	};

	const pullFromRemote = async (remote: SyncConfig) => {
		setError(null);
		setBusy(true);
		setState({
			kind: "pulling",
			label: Messages.encryption.pulling_from_remote,
		});
		try {
			const { SyncClient, wsVaultUrl } = await import(
				"../../shared/sync/SyncClient"
			);
			await new Promise<void>((resolve, reject) => {
				const client = new SyncClient({
					url: wsVaultUrl(),
					sessionToken: remote.sessionToken,
					localStore: store,
					events: {
						onReconcileDone: () => {
							client.stop().finally(resolve);
						},
						onStatus: (s) => {
							if (s === "denied" || s === "error") {
								client.stop().finally(() => reject(new Error(s)));
							}
						},
					},
				});
				client.start();
			});

			pendingSyncRef.current = remote;

			if (await hasEncryptionMeta(store)) {
				reset();
				setState({ kind: "unlock" });
				return;
			}
			reset();
			setState({ kind: "setup" });
		} catch (err) {
			console.error("pull-from-remote failed", err);
			setError(Messages.encryption.network_error);
			setState({ kind: "choose" });
			setBusy(false);
		}
	};

	const onPasskeyRegister = async () => {
		const name = displayName.trim();
		if (name.length === 0) {
			setError(Messages.encryption.display_name_required);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const syncConfig = await registerPasskey(name);
			await pullFromRemote(syncConfig);
		} catch (err) {
			console.error("passkey register failed", err);
			setError(Messages.encryption.passkey_error);
			setBusy(false);
		}
	};

	const onPasskeyLogin = async () => {
		setError(null);
		setBusy(true);
		try {
			const syncConfig = await loginPasskey();
			await pullFromRemote(syncConfig);
		} catch (err) {
			console.error("passkey login failed", err);
			setError(Messages.encryption.passkey_error);
			setBusy(false);
		}
	};

	const onInviteRegister = async (token: string) => {
		const name = displayName.trim();
		if (name.length === 0) {
			setError(Messages.encryption.display_name_required);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const syncConfig = await registerViaInvite(token, name);
			await pullFromRemote(syncConfig);
		} catch (err) {
			console.error("invite register failed", err);
			setError(Messages.encryption.passkey_error);
			setBusy(false);
		}
	};

	if (state.kind === "loading") {
		return (
			<MinimalBasicScreen>
				<p>{Messages.util.loading}</p>
			</MinimalBasicScreen>
		);
	}

	if (!isWebCryptoAvailable()) {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold text-danger-300">
					{Messages.encryption.insecure_context_title}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.encryption.insecure_context_description}
				</p>
				<p className="text-xs opacity-60 font-mono">
					{globalThis.location?.origin}
				</p>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "pulling") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">{state.label}</h2>
				<p className="text-sm opacity-80">{Messages.util.loading}</p>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "choose") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.encryption.choose_title}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.encryption.choose_description}
				</p>
				<div className="flex flex-col gap-4 w-full max-w-sm">
					<OkButton
						onClick={goSetup}
						title={Messages.encryption.create_new_account}
					/>
					<SecondaryButton
						onClick={() => {
							reset();
							setState({ kind: "passkey" });
						}}
						title={Messages.encryption.signin_online_account}
					/>
				</div>
				{error && (
					<p className="text-sm text-danger-300" data-testid="encryptionError">
						{error}
					</p>
				)}
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "passkey") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.encryption.signin_online_account}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.encryption.passkey_description}
				</p>
				<div className="flex flex-col gap-4 w-full max-w-sm">
					<Input
						testId="displayName"
						type="text"
						autoComplete="username"
						immediate
						placeholder={Messages.encryption.display_name_placeholder}
						value={displayName}
						disabled={busy}
						containerArea
						onChange={(value) => {
							setDisplayName(value);
							setError(null);
						}}
					/>
				</div>
				<p className="text-xs opacity-60">
					{Messages.encryption.display_name_login_hint}
				</p>
				<a
					href="https://fidoalliance.org/passkeys/"
					target="_blank"
					rel="noreferrer noopener"
					className="text-xs underline opacity-70 hover:opacity-100"
				>
					{Messages.encryption.passkey_learn_more}
				</a>
				{error && (
					<p className="text-sm text-danger-300" data-testid="encryptionError">
						{error}
					</p>
				)}
				<div className="flex flex-wrap justify-center gap-2">
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
						className="px-3 py-1.5"
					/>
					<SecondaryButton
						onClick={onPasskeyLogin}
						title={Messages.encryption.passkey_login}
						disabled={busy}
						className="px-3 py-1.5"
					/>
					<OkButton
						onClick={onPasskeyRegister}
						title={Messages.encryption.passkey_register}
						disabled={busy || displayName.trim().length === 0}
						className="px-3 py-1.5"
					/>
				</div>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "invite") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.encryption.invite_title}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.encryption.invite_description}
				</p>
				<div className="flex flex-col gap-4 w-full max-w-sm">
					<Input
						testId="displayName"
						type="text"
						autoComplete="username"
						immediate
						placeholder={Messages.encryption.display_name_placeholder}
						value={displayName}
						disabled={busy}
						containerArea
						onChange={(value) => {
							setDisplayName(value);
							setError(null);
						}}
					/>
				</div>
				{error && (
					<p className="text-sm text-danger-300" data-testid="encryptionError">
						{error}
					</p>
				)}
				<div className="flex flex-wrap justify-center gap-2">
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
						className="px-3 py-1.5"
					/>
					<OkButton
						onClick={() => onInviteRegister(state.token)}
						title={Messages.encryption.invite_join}
						disabled={busy || displayName.trim().length === 0}
						className="px-3 py-1.5"
					/>
				</div>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "confirm-delete") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold text-danger-300">
					{Messages.menu.delete_data}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.menu.delete_data_confirm}
				</p>
				<div className="flex gap-2">
					<CancelButton onClick={() => setState(state.returnTo)} />
					<DeleteButton
						onClick={async () => {
							await store.destroy();
							window.localStorage.clear();
							window.sessionStorage.clear();
							window.location.reload();
						}}
					>
						<span className="flex items-center gap-1">
							<TrashIcon className="h-4 w-4 shrink-0" />
							{Messages.menu.delete_data}
						</span>
					</DeleteButton>
				</div>
			</MinimalBasicScreen>
		);
	}

	const isSetup = state.kind === "setup";
	const onSubmit = isSetup ? onSubmitSetup : onSubmitUnlock;
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
			<form
				className="flex flex-col gap-4 w-full max-w-sm"
				onSubmit={(event) => {
					event.preventDefault();
					if (isSetup && confirm.length === 0) return;
					onSubmit();
				}}
			>
				<Input
					testId="encryptionPassphrase"
					type="password"
					autoComplete={isSetup ? "new-password" : "current-password"}
					placeholder={Messages.encryption.passphrase_placeholder}
					value={passphrase}
					disabled={busy}
					containerArea
					onChange={(value) => {
						setPassphrase(value);
						setError(null);
					}}
				/>
				{isSetup && (
					<Input
						testId="encryptionPassphraseConfirm"
						type="password"
						autoComplete="new-password"
						placeholder={Messages.encryption.confirm_placeholder}
						value={confirm}
						disabled={busy}
						containerArea
						onChange={(value) => {
							setConfirm(value);
							setError(null);
						}}
					/>
				)}
				<button type="submit" hidden />
			</form>
			{error && (
				<p className="text-sm text-danger-300" data-testid="encryptionError">
					{error}
				</p>
			)}
			{busy && (
				<p className="text-sm opacity-80">{Messages.encryption.unlocking}</p>
			)}
			{isSetup ? (
				<div className="flex flex-wrap justify-center gap-2">
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
						className="px-3 py-1.5"
					/>
					<OkButton
						disabled={busy || passphrase.length === 0}
						onClick={onSubmit}
						className="px-3 py-1.5"
					>
						<span className="flex items-center gap-1">
							{Messages.encryption.setup_submit}
						</span>
					</OkButton>
				</div>
			) : (
				<div className="flex justify-between w-full max-w-sm gap-2">
					<DeleteButton
						onClick={() =>
							setState({ kind: "confirm-delete", returnTo: state })
						}
						disabled={busy}
						className="px-3 py-1.5"
					>
						<span className="flex items-center gap-1">
							<TrashIcon className="h-4 w-4 shrink-0" />
							{Messages.menu.delete_data}
						</span>
					</DeleteButton>
					<OkButton
						disabled={busy || passphrase.length === 0}
						onClick={onSubmit}
						className="px-3 py-1.5"
					>
						<span className="flex items-center gap-1">
							<LockOpenIcon className="h-4 w-4 shrink-0" />
							{Messages.encryption.unlock_submit}
						</span>
					</OkButton>
				</div>
			)}
		</MinimalBasicScreen>
	);
}
