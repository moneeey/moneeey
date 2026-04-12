import { useEffect, useState } from "react";

import type { SyncConfig } from "../../entities/Config";
import {
	MIN_PASSPHRASE_LENGTH,
	type UnlockResult,
	openEncryptedDatabase,
} from "../../shared/EncryptionStore";
import { hasEncryptionMeta } from "../../shared/encryption/encryptedPouch";
import { Status } from "../../shared/Persistence";
import { startMagicLink, pollForMagicLinkAuth } from "../../shared/encryption/bootstrapFromMoneeeyAccount";
import useMessages from "../../utils/Messages";
import { OkButton, SecondaryButton } from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";
import SelfHostedSyncForm from "../sync/SelfHostedSyncForm";

type Props = {
	db: PouchDB.Database;
	onUnlocked: (result: UnlockResult) => void;
};

type GateState =
	| { kind: "loading" }
	| { kind: "choose" }
	| { kind: "setup" }
	| { kind: "unlock" }
	| { kind: "magic-link" }
	| { kind: "self-hosted" }
	| { kind: "pulling"; label: string }
	| { kind: "setup-after-pull" };

const messageForError = (
	err: unknown,
	Messages: ReturnType<typeof useMessages>,
): string => {
	const code = (err as Error)?.message;
	if (code === "passphrase_too_short") {
		return Messages.encryption.passphrase_too_short;
	}
	if (code === "wrong_passphrase" || code === "no_meta_doc") {
		return Messages.encryption.wrong_passphrase;
	}
	return Messages.encryption.wrong_passphrase;
};

/**
 * First-mount mode detection. Reads the ENCRYPTION-META doc; if present
 * the user is returning and we show unlock, otherwise we show the three-way
 * choice (create new / magic link / self-hosted).
 */
const detectInitialState = async (
	db: PouchDB.Database,
): Promise<GateState> => {
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
	const [email, setEmail] = useState("");

	// Detect mode on mount. If the local DB has an ENCRYPTION-META doc from
	// a previous setup (or just replicated in from a remote), land on the
	// unlock form; otherwise, on the three-way choice.
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
			const result = await openEncryptedDatabase(db, passphrase, "setup");
			onUnlocked(result);
		} catch (err) {
			setError(messageForError(err, Messages));
			setBusy(false);
		}
	};

	const onSubmitUnlock = async () => {
		if (passphrase.length === 0) {
			setError(Messages.encryption.wrong_passphrase);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const result = await openEncryptedDatabase(db, passphrase, "unlock");
			onUnlocked(result);
		} catch (err) {
			setError(messageForError(err, Messages));
			setBusy(false);
		}
	};

	// Pull from a remote SyncConfig. After replication, check for
	// ENCRYPTION-META: if found, transition to unlock mode so the user can
	// enter the passphrase for the pulled account; otherwise surface an
	// error and return to the choose screen.
	const pullFromRemote = async (remote: SyncConfig) => {
		setError(null);
		setBusy(true);
		setState({
			kind: "pulling",
			label: Messages.encryption.pulling_from_remote,
		});
		try {
			// One-shot pull+push. The gate's db is still plaintext-empty, so
			// the "push" direction has nothing to send; all real work is the
			// incoming replication of already-encrypted envelopes from the
			// remote, which pass through transform-pouch untouched (the
			// transform isn't even installed yet).
			await new Promise<void>((resolve, reject) => {
				db.sync(remote.url, {
					live: false,
					retry: false,
					// @ts-expect-error PouchDB types don't expose `auth` on
					// the options object for this overload, but the raw
					// implementation passes it through to the remote factory.
					auth:
						remote.username === "JWT"
							? undefined
							: { username: remote.username, password: remote.password },
				})
					.on("complete", () => resolve())
					.on("error", (err: unknown) => reject(err));
			});

			const found = await hasEncryptionMeta(db);
			if (found) {
				reset();
				setState({ kind: "unlock" });
				return;
			}
			setError(Messages.encryption.no_existing_data_found);
			setState({ kind: "choose" });
			setBusy(false);
		} catch (err) {
			console.error("pull-from-remote failed", err);
			setError(Messages.encryption.wrong_passphrase);
			setState({ kind: "choose" });
			setBusy(false);
		}
	};

	const onMagicLinkSubmit = async () => {
		setError(null);
		setBusy(true);
		setState({
			kind: "pulling",
			label: Messages.encryption.waiting_for_magic_link,
		});
		try {
			const sent = await startMagicLink(email);
			if (!sent) {
				setError(Messages.encryption.no_existing_data_found);
				setState({ kind: "magic-link" });
				setBusy(false);
				return;
			}
			const remote = await pollForMagicLinkAuth();
			await pullFromRemote(remote);
		} catch (err) {
			console.error("magic-link flow failed", err);
			setError(Messages.encryption.no_existing_data_found);
			setState({ kind: "choose" });
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

	if (state.kind === "pulling") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">{state.label}</h2>
				<p className="text-sm opacity-80">{Messages.util.loading}</p>
				{/* Sync status is driven by Persistence, but here we only show
				    a static message because the gate runs its own one-shot sync
				    rather than live sync. */}
				<p className="text-xs opacity-60">{Status.OFFLINE}</p>
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
							setState({ kind: "magic-link" });
						}}
						title={Messages.encryption.signin_magic_link}
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

	if (state.kind === "magic-link") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.encryption.signin_magic_link}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.encryption.magic_link_description}
				</p>
				<div className="flex flex-col gap-3 w-full max-w-sm">
					<input
						data-testid="magicLinkEmail"
						type="email"
						placeholder={Messages.login.email}
						value={email}
						disabled={busy}
						onChange={(event) => setEmail(event.target.value)}
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
						onClick={onMagicLinkSubmit}
						title={Messages.login.login_or_signup}
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

	// setup or unlock — both are passphrase forms that differ in whether a
	// confirm field is rendered and which API call fires on submit.
	const isSetup = state.kind === "setup";
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
						if (event.key === "Enter" && !isSetup) onSubmitUnlock();
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
							if (event.key === "Enter") onSubmitSetup();
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
				{/* Allow returning to the three-way chooser only when the user
				    is genuinely in "no local encryption yet" land — the unlock
				    form's only out is entering the correct passphrase (or
				    going to lock/reset, which lives post-unlock). */}
				{isSetup && (
					<SecondaryButton
						onClick={goChoose}
						title={Messages.util.cancel}
						disabled={busy}
					/>
				)}
				<OkButton
					disabled={busy || passphrase.length === 0}
					onClick={isSetup ? onSubmitSetup : onSubmitUnlock}
					title={
						isSetup
							? Messages.encryption.setup_submit
							: Messages.encryption.unlock_submit
					}
				/>
			</div>
			{isSetup && (
				<p className="text-xs opacity-60 max-w-md">
					{Messages.encryption.upgrade_hint}
				</p>
			)}
		</MinimalBasicScreen>
	);
}

