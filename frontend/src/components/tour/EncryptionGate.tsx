import { useEffect, useRef, useState } from "react";

import type { SyncConfig } from "../../entities/Config";
import {
	type EncryptionErrorCode,
	MIN_PASSPHRASE_LENGTH,
	openEncryptedDatabase,
} from "../../shared/EncryptionStore";
import { PouchDBRemoteFactory } from "../../shared/Persistence";
import {
	fetchMagicLinkState,
	pollForMagicLinkAuth,
	startMagicLink,
} from "../../shared/encryption/bootstrapFromMoneeeyAccount";
import { isWebCryptoAvailable } from "../../shared/encryption/crypto";
import { hasEncryptionMeta } from "../../shared/encryption/encryptedPouch";
import useMessages, { type TMessages } from "../../utils/Messages";
import { OkButton, SecondaryButton } from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";
import SelfHostedSyncForm from "../sync/SelfHostedSyncForm";

type Props = {
	db: PouchDB.Database;
	onUnlocked: (dataKey: CryptoKey) => void;
};

type GateState =
	| { kind: "loading" }
	| { kind: "choose" }
	| { kind: "setup" }
	| { kind: "unlock" }
	| { kind: "magic-link" }
	| { kind: "self-hosted" }
	| {
			kind: "pulling";
			label: string;
			progress?: { attempt: number; max: number };
			onCancel?: () => void;
	  };

/**
 * Maps a thrown encryption error code to a user-visible message. Falls
 * back to the generic unknown-error string so we never render the raw code
 * in the UI.
 */
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
		case "magic_link_cancelled":
		case "magic_link_timeout":
			return Messages.encryption.magic_link_timeout;
		default:
			return Messages.encryption.unknown_error;
	}
};

const detectInitialState = async (db: PouchDB.Database): Promise<GateState> => {
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
	// AbortController for any in-flight magic-link poll. Held in a ref so
	// cancel handlers survive re-renders without re-creating the
	// controller.
	const pollAbortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		let cancelled = false;
		detectInitialState(db).then((next) => {
			if (!cancelled) setState(next);
		});
		return () => {
			cancelled = true;
			// Drop any dangling poll when the gate unmounts (e.g. after
			// successful unlock).
			pollAbortRef.current?.abort();
		};
	}, [db]);

	const reset = () => {
		setPassphrase("");
		setConfirm("");
		setError(null);
		setBusy(false);
	};

	const goChoose = () => {
		pollAbortRef.current?.abort();
		pollAbortRef.current = null;
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
			onUnlocked(dataKey);
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
			onUnlocked(dataKey);
		} catch (err) {
			setError(messageForError(err, Messages));
			setBusy(false);
		}
	};

	/**
	 * Runs a one-shot pull from the given remote into the local `db`. After
	 * replication completes, re-checks for the ENCRYPTION-META doc:
	 *   - found     → transition to unlock so the user enters the passphrase
	 *   - not found → return to chooser with "no data on that server"
	 *   - error     → return to chooser with a network error message
	 *
	 * The remote is built via `PouchDBRemoteFactory` so that both magic-link
	 * (JWT) and self-hosted (basic auth) credentials flow through the same
	 * custom-fetch header injection that the post-unlock `PersistenceStore`
	 * uses.
	 */
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
				// The gate's db is still plaintext-empty, so the "push"
				// direction has nothing to send; all real work is incoming
				// replication of already-encrypted envelopes, which pass
				// through transform-pouch untouched (no transform installed
				// yet).
				db.sync(remoteDb, { live: false, retry: false })
					.on("complete", () => resolve())
					.on("denied", (info) =>
						reject(new Error(`denied: ${JSON.stringify(info)}`)),
					)
					.on("error", (err: unknown) => reject(err));
			});

			if (await hasEncryptionMeta(db)) {
				reset();
				setState({ kind: "unlock" });
				return;
			}
			// Sync succeeded but the remote had no ENCRYPTION-META — either
			// the URL points at the wrong database or the user doesn't
			// actually have a prior Moneeey account there.
			setError(Messages.encryption.no_existing_data_found);
			setState({ kind: "choose" });
			setBusy(false);
		} catch (err) {
			console.error("pull-from-remote failed", err);
			// Anything that crashed the replication path is most likely a
			// networking or auth problem.
			setError(Messages.encryption.network_error);
			setState({ kind: "choose" });
			setBusy(false);
		}
	};

	const onMagicLinkSubmit = async () => {
		setError(null);
		setBusy(true);
		// Fresh AbortController for this attempt so the Cancel button can
		// interrupt both the `await` on the poll and any in-flight network
		// request.
		const controller = new AbortController();
		pollAbortRef.current = controller;
		setState({
			kind: "pulling",
			label: Messages.encryption.waiting_for_magic_link,
			progress: { attempt: 0, max: 30 },
			onCancel: () => controller.abort(),
		});
		try {
			const sent = await startMagicLink(email);
			if (!sent) {
				setError(Messages.encryption.no_existing_data_found);
				setState({ kind: "magic-link" });
				setBusy(false);
				return;
			}
			// If the user has already clicked the link in another window
			// between `startMagicLink` and our first poll, shortcut straight
			// to replication.
			const immediate = await fetchMagicLinkState();
			const remote =
				immediate ??
				(await pollForMagicLinkAuth({
					signal: controller.signal,
					onAttempt: (attempt, max) => {
						setState((prev) =>
							prev.kind === "pulling"
								? { ...prev, progress: { attempt, max } }
								: prev,
						);
					},
				}));
			await pullFromRemote(remote);
		} catch (err) {
			if ((err as Error).message === "magic_link_cancelled") {
				// User hit Cancel — go quietly back to the chooser.
				goChoose();
				return;
			}
			console.error("magic-link flow failed", err);
			setError(messageForError(err, Messages));
			setState({ kind: "choose" });
			setBusy(false);
		} finally {
			if (pollAbortRef.current === controller) {
				pollAbortRef.current = null;
			}
		}
	};

	if (state.kind === "loading") {
		return (
			<MinimalBasicScreen>
				<p>{Messages.util.loading}</p>
			</MinimalBasicScreen>
		);
	}

	// WebCrypto (crypto.subtle) requires a secure context — HTTPS or
	// literal localhost. A custom hostname like `local.moneeey.io` over
	// plain HTTP does NOT qualify in Chrome/Firefox. Surface a clear error
	// instead of letting every crypto call fail cryptically.
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
				{state.progress && (
					<p className="text-xs opacity-60" data-testid="magicLinkProgress">
						{Messages.encryption.waiting_progress(
							state.progress.attempt,
							state.progress.max,
						)}
					</p>
				)}
				{state.onCancel && (
					<SecondaryButton
						onClick={state.onCancel}
						title={Messages.util.cancel}
					/>
				)}
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
						onChange={(event) => {
							setEmail(event.target.value);
							setError(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" && email.length > 0) {
								onMagicLinkSubmit();
							}
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
						// Enter submits in both setup and unlock. For setup we
						// only fire if both fields are populated, so stray
						// Enters while editing the first field don't bounce
						// through the confirm-mismatch path.
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
					onClick={onSubmit}
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
