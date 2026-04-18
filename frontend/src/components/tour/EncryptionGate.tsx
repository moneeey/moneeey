import { LockOpenIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

import type { SyncConfig } from "../../entities/Config";
import {
	type EncryptionErrorCode,
	MIN_PASSPHRASE_LENGTH,
	openEncryptedDatabase,
} from "../../shared/EncryptionStore";
import { PouchDBRemoteFactory, deleteAllData } from "../../shared/Persistence";
import {
	getInviteInfo,
	loginPasskey,
	registerPasskey,
	registerViaInvite,
} from "../../shared/encryption/bootstrapFromPasskey";
import { isWebCryptoAvailable } from "../../shared/encryption/crypto";
import { hasEncryptionMeta } from "../../shared/encryption/encryptedPouch";
import useMessages, { type TMessages } from "../../utils/Messages";
import {
	CancelButton,
	DeleteButton,
	OkButton,
	SecondaryButton,
} from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";
import SelfHostedSyncForm from "../sync/SelfHostedSyncForm";

export type UnlockResult = {
	dataKey: CryptoKey;
	syncConfig?: SyncConfig;
};

type Props = {
	db: PouchDB.Database;
	onUnlocked: (result: UnlockResult) => void;
};

type GateState =
	| { kind: "loading" }
	| { kind: "choose" }
	| { kind: "setup" }
	| { kind: "unlock" }
	| { kind: "passkey" }
	| { kind: "invite"; token: string }
	| { kind: "self-hosted" }
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
	const match = hash.match(/#\/invite\/([a-f0-9]+)/);
	return match ? match[1] : null;
}

const detectInitialState = async (db: PouchDB.Database): Promise<GateState> => {
	const inviteToken = parseInviteToken();
	if (inviteToken) {
		const info = await getInviteInfo(inviteToken);
		if (info?.valid) {
			return { kind: "invite", token: inviteToken };
		}
	}
	return (await hasEncryptionMeta(db))
		? { kind: "unlock" }
		: { kind: "choose" };
};

export default function EncryptionGate({ db, onUnlocked }: Props) {
	const Messages = useMessages();
	const [state, setState] = useState<GateState>({ kind: "loading" });
	const [passphrase, setPassphrase] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const pendingSyncRef = useRef<SyncConfig | null>(null);
	const [email, setEmail] = useState("");

	useEffect(() => {
		let cancelled = false;
		detectInitialState(db).then((next) => {
			if (!cancelled) setState(next);
		});
		return () => {
			cancelled = true;
		};
	}, [db]);

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
			const dataKey = await openEncryptedDatabase(db, passphrase, "setup");
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
			const dataKey = await openEncryptedDatabase(db, passphrase, "unlock");
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
			const remoteDb = PouchDBRemoteFactory(remote);
			await new Promise<void>((resolve, reject) => {
				db.sync(remoteDb, { live: false, retry: false })
					.on("complete", () => resolve())
					.on("denied", (info) =>
						reject(new Error(`denied: ${JSON.stringify(info)}`)),
					)
					.on("error", (err: unknown) => reject(err));
			});

			pendingSyncRef.current = remote;

			if (await hasEncryptionMeta(db)) {
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
		setError(null);
		setBusy(true);
		try {
			const syncConfig = await registerPasskey(email);
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
			const syncConfig = await loginPasskey(email);
			await pullFromRemote(syncConfig);
		} catch (err) {
			console.error("passkey login failed", err);
			setError(Messages.encryption.passkey_error);
			setBusy(false);
		}
	};

	const onInviteRegister = async (token: string) => {
		setError(null);
		setBusy(true);
		try {
			const syncConfig = await registerViaInvite(token, email);
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
				<div className="flex flex-col gap-3 w-full max-w-sm">
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
					<SecondaryButton
						onClick={() => {
							reset();
							setState({ kind: "self-hosted" });
						}}
						title={Messages.encryption.signin_self_hosted}
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
				<div className="flex flex-col gap-3 w-full max-w-sm">
					<input
						data-testid="passkeyEmail"
						type="email"
						autoComplete="username webauthn"
						placeholder={Messages.login.email}
						value={email}
						disabled={busy}
						onChange={(event) => {
							setEmail(event.target.value);
							setError(null);
						}}
						className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>
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
				<div className="flex gap-2">
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
					/>
					<SecondaryButton
						onClick={onPasskeyLogin}
						title={Messages.encryption.passkey_login}
						disabled={busy || email.length === 0}
					/>
					<OkButton
						onClick={onPasskeyRegister}
						title={Messages.encryption.passkey_register}
						disabled={busy || email.length === 0}
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
				<div className="flex flex-col gap-3 w-full max-w-sm">
					<input
						data-testid="inviteEmail"
						type="email"
						autoComplete="username webauthn"
						placeholder={Messages.login.email}
						value={email}
						disabled={busy}
						onChange={(event) => {
							setEmail(event.target.value);
							setError(null);
						}}
						className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				{error && (
					<p className="text-sm text-danger-300" data-testid="encryptionError">
						{error}
					</p>
				)}
				<div className="flex gap-2">
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
					/>
					<OkButton
						onClick={() => onInviteRegister(state.token)}
						title={Messages.encryption.invite_join}
						disabled={busy || email.length === 0}
					/>
				</div>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "self-hosted") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.encryption.signin_self_hosted}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.encryption.self_hosted_description}
				</p>
				<SelfHostedSyncForm
					onSubmit={(remote) => pullFromRemote(remote)}
					submitTitle={Messages.encryption.pull_from_remote}
					disabled={busy}
				/>
				{error && (
					<p className="text-sm text-danger-300" data-testid="encryptionError">
						{error}
					</p>
				)}
				<SecondaryButton
					onClick={goChoose}
					title={Messages.util.cancel}
					disabled={busy}
				/>
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
					<DeleteButton onClick={() => deleteAllData(db)}>
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
			<div className="flex flex-col gap-3 w-full max-w-sm">
				<input
					data-testid="encryptionPassphrase"
					type="password"
					autoComplete={isSetup ? "new-password" : "current-password"}
					placeholder={Messages.encryption.passphrase_placeholder}
					value={passphrase}
					disabled={busy}
					onChange={(event) => {
						setPassphrase(event.target.value);
						setError(null);
					}}
					onKeyDown={(event) => {
						if (event.key !== "Enter") return;
						if (isSetup && confirm.length === 0) return;
						onSubmit();
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
						onChange={(event) => {
							setConfirm(event.target.value);
							setError(null);
						}}
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
			<div className="flex gap-2">
				{isSetup && (
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
					/>
				)}
				<OkButton disabled={busy || passphrase.length === 0} onClick={onSubmit}>
					<span className="flex items-center gap-1">
						{!isSetup && <LockOpenIcon className="h-4 w-4 shrink-0" />}
						{isSetup
							? Messages.encryption.setup_submit
							: Messages.encryption.unlock_submit}
					</span>
				</OkButton>
			</div>
			{!isSetup && (
				<DeleteButton
					onClick={() => setState({ kind: "confirm-delete", returnTo: state })}
					disabled={busy}
				>
					<span className="flex items-center gap-1">
						<TrashIcon className="h-4 w-4 shrink-0" />
						{Messages.menu.delete_data}
					</span>
				</DeleteButton>
			)}
		</MinimalBasicScreen>
	);
}
