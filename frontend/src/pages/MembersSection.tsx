import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Status } from "../components/Status";
import {
	DeleteButton,
	LinkButton,
	SecondaryButton,
} from "../components/base/Button";
import { VerticalSpace } from "../components/base/Space";
import {
	type VaultMember,
	type VaultMembersResponse,
	kickVaultMember,
	listVaultMembers,
	transferVaultOwnership,
} from "../shared/encryption/bootstrapFromPasskey";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

type Confirm =
	| { kind: "kick"; userId: string; displayName: string }
	| { kind: "transfer"; userId: string; displayName: string }
	| null;

const formatRole = (
	role: "owner" | "member",
	Messages: ReturnType<typeof useMessages>,
) => (role === "owner" ? Messages.sync.role_owner : Messages.sync.role_member);

const MemberRow = ({
	member,
	youAreOwner,
	isYou,
	busy,
	onKick,
	onTransfer,
}: {
	member: VaultMember;
	youAreOwner: boolean;
	isYou: boolean;
	busy: boolean;
	onKick: () => void;
	onTransfer: () => void;
}) => {
	const Messages = useMessages();
	return (
		<li
			data-testid={`member-row-${member.displayName}`}
			className="flex items-center justify-between gap-2 rounded border border-background-700 bg-background-900 p-2"
		>
			<div className="flex flex-col">
				<span className="text-sm font-medium">
					{member.displayName}
					{isYou && (
						<span className="ml-2 text-xs opacity-60">
							({Messages.sync.you_label})
						</span>
					)}
				</span>
				<span className="text-xs opacity-70">
					{formatRole(member.role, Messages)}
				</span>
			</div>
			{youAreOwner && !isYou && (
				<div className="flex gap-2">
					{member.role === "member" && (
						<>
							<SecondaryButton
								testId={`transfer-${member.displayName}`}
								onClick={onTransfer}
								title={Messages.sync.member_transfer}
								disabled={busy}
								compact
							/>
							<DeleteButton
								testId={`kick-${member.displayName}`}
								onClick={onKick}
								disabled={busy}
							>
								<span className="px-1">{Messages.sync.member_kick}</span>
							</DeleteButton>
						</>
					)}
				</div>
			)}
		</li>
	);
};

export const MembersSection = observer(() => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [data, setData] = useState<VaultMembersResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [confirm, setConfirm] = useState<Confirm>(null);

	const refresh = useCallback(async () => {
		if (!management.vaultId) return;
		try {
			const result = await listVaultMembers(management.vaultId);
			setData(result);
			setError(null);
		} catch (err) {
			console.error("members load failed", err);
			setError(Messages.sync.members_load_error);
		}
	}, [Messages.sync.members_load_error, management.vaultId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const onConfirmKick = async () => {
		if (!confirm || confirm.kind !== "kick" || !management.vaultId) return;
		setBusy(true);
		setError(null);
		try {
			await kickVaultMember(management.vaultId, confirm.userId);
			setConfirm(null);
			await refresh();
		} catch (err) {
			console.error("kick failed", err);
			setError(Messages.sync.members_action_error);
		} finally {
			setBusy(false);
		}
	};

	const onConfirmTransfer = async () => {
		if (!confirm || confirm.kind !== "transfer" || !management.vaultId) return;
		setBusy(true);
		setError(null);
		try {
			await transferVaultOwnership(management.vaultId, confirm.userId);
			setConfirm(null);
			await refresh();
		} catch (err) {
			console.error("transfer failed", err);
			setError(Messages.sync.members_action_error);
		} finally {
			setBusy(false);
		}
	};

	if (!management.vaultId) return null;

	return (
		<VerticalSpace testId="membersSection">
			<h3 className="text-base font-semibold">{Messages.sync.members_title}</h3>
			<p className="text-sm opacity-80">{Messages.sync.members_description}</p>
			{error && <Status type="error">{error}</Status>}
			{data ? (
				<ul className="flex flex-col gap-2">
					{data.members.map((m) => (
						<MemberRow
							key={m.userId}
							member={m}
							youAreOwner={data.yourRole === "owner"}
							isYou={m.userId === data.yourUserId}
							busy={busy}
							onKick={() =>
								setConfirm({
									kind: "kick",
									userId: m.userId,
									displayName: m.displayName,
								})
							}
							onTransfer={() =>
								setConfirm({
									kind: "transfer",
									userId: m.userId,
									displayName: m.displayName,
								})
							}
						/>
					))}
				</ul>
			) : (
				!error && <p className="text-sm opacity-70">{Messages.util.loading}</p>
			)}
			{confirm && (
				<div
					data-testid={`confirm-${confirm.kind}`}
					className="rounded border border-danger-700 bg-background-900 p-3"
				>
					<p className="mb-2 text-sm">
						{confirm.kind === "kick"
							? Messages.sync.member_kick_confirm
							: Messages.sync.member_transfer_confirm}{" "}
						<span className="font-mono">{confirm.displayName}</span>
					</p>
					<div className="flex gap-2">
						<LinkButton
							onClick={() => setConfirm(null)}
							title={Messages.util.cancel}
							disabled={busy}
						/>
						{confirm.kind === "kick" ? (
							<DeleteButton
								onClick={onConfirmKick}
								disabled={busy}
								testId="confirm-kick-button"
							>
								<span className="px-1">{Messages.sync.member_kick}</span>
							</DeleteButton>
						) : (
							<DeleteButton
								onClick={onConfirmTransfer}
								disabled={busy}
								testId="confirm-transfer-button"
							>
								<span className="px-1">{Messages.sync.member_transfer}</span>
							</DeleteButton>
						)}
					</div>
				</div>
			)}
		</VerticalSpace>
	);
});
