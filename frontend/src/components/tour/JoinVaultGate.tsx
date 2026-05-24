import { useEffect, useState } from "react";

import {
	acceptInvite,
	getInviteInfo,
} from "../../shared/encryption/bootstrapFromPasskey";
import useMessages from "../../utils/Messages";
import { CancelButton, OkButton } from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";

type Props = {
	token: string;
	onDone: () => void;
	onCancel: () => void;
};

type GateState =
	| { kind: "loading" }
	| { kind: "confirm" }
	| { kind: "joining" }
	| { kind: "error"; message: string }
	| { kind: "needs-sign-in" }
	| { kind: "joined" };

export default function JoinVaultGate({ token, onDone, onCancel }: Props) {
	const Messages = useMessages();
	const [state, setState] = useState<GateState>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		getInviteInfo(token).then((info) => {
			if (cancelled) return;
			setState(
				info?.valid
					? { kind: "confirm" }
					: {
							kind: "error",
							message: Messages.sync.join_vault_invalid_invite,
						},
			);
		});
		return () => {
			cancelled = true;
		};
	}, [token, Messages.sync.join_vault_invalid_invite]);

	const onAccept = async () => {
		setState({ kind: "joining" });
		try {
			await acceptInvite(token);
			setState({ kind: "joined" });
		} catch (err) {
			const msg = (err as Error).message;
			if (msg === "not authenticated") {
				setState({ kind: "needs-sign-in" });
				return;
			}
			setState({
				kind: "error",
				message: Messages.sync.join_vault_error,
			});
		}
	};

	if (state.kind === "loading" || state.kind === "joining") {
		return (
			<MinimalBasicScreen>
				<p>{Messages.util.loading}</p>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "joined") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.sync.join_vault_success_title}
				</h2>
				<p className="text-sm opacity-80">
					{Messages.sync.join_vault_success_description}
				</p>
				<OkButton
					testId="joinVaultDone"
					onClick={onDone}
					title={Messages.sync.join_vault_continue}
				/>
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "error") {
		return (
			<MinimalBasicScreen>
				<p className="text-sm text-danger-300" data-testid="joinVaultError">
					{state.message}
				</p>
				<CancelButton onClick={onCancel} title={Messages.util.cancel} />
			</MinimalBasicScreen>
		);
	}

	if (state.kind === "needs-sign-in") {
		return (
			<MinimalBasicScreen>
				<h2 className="text-xl font-semibold">
					{Messages.sync.join_vault_needs_sign_in_title}
				</h2>
				<p className="text-sm opacity-80" data-testid="joinVaultNeedsSignIn">
					{Messages.sync.join_vault_needs_sign_in_description}
				</p>
				<CancelButton onClick={onCancel} title={Messages.util.cancel} />
			</MinimalBasicScreen>
		);
	}

	return (
		<MinimalBasicScreen>
			<h2 className="text-xl font-semibold">
				{Messages.sync.join_vault_title}
			</h2>
			<p className="text-sm opacity-80">
				{Messages.sync.join_vault_description}
			</p>
			<div className="flex gap-2">
				<CancelButton onClick={onCancel} title={Messages.util.cancel} />
				<OkButton
					testId="joinVaultAccept"
					onClick={onAccept}
					title={Messages.sync.join_vault_accept}
				/>
			</div>
		</MinimalBasicScreen>
	);
}
