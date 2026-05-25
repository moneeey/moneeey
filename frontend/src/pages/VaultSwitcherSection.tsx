import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Status } from "../components/Status";
import {
	DeleteButton,
	OkButton,
	SecondaryButton,
} from "../components/base/Button";
import { Input } from "../components/base/Input";
import { VerticalSpace } from "../components/base/Space";
import {
	type VaultListItem,
	deleteVault as apiDeleteVault,
	createVault,
	listMyVaults,
	renameVault,
} from "../shared/encryption/bootstrapFromPasskey";
import { selectVaultForTabAndReload } from "../shared/storage/tabVault";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

const formatDate = (iso: string): string => {
	try {
		return new Date(iso).toLocaleDateString();
	} catch {
		return iso;
	}
};

export const VaultSwitcherSection = observer(() => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [vaults, setVaults] = useState<VaultListItem[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [renaming, setRenaming] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [creating, setCreating] = useState(false);
	const [createValue, setCreateValue] = useState("");
	const [confirmDelete, setConfirmDelete] = useState<VaultListItem | null>(
		null,
	);
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		try {
			const vs = await listMyVaults();
			setVaults(vs);
		} catch (err) {
			console.error("vaults load failed", err);
			setError(Messages.sync.members_load_error);
		}
	}, [Messages.sync.members_load_error]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const onSaveRename = async (vaultId: string) => {
		const next = renameValue.trim();
		if (next.length === 0) return;
		setBusy(true);
		try {
			await renameVault(vaultId, next);
			setRenaming(null);
			setRenameValue("");
			await refresh();
		} catch (err) {
			console.error("rename failed", err);
			setError(Messages.sync.members_action_error);
		} finally {
			setBusy(false);
		}
	};

	const onCreate = async () => {
		setBusy(true);
		setError(null);
		try {
			await createVault(createValue.trim() || undefined);
			setCreating(false);
			setCreateValue("");
			await refresh();
		} catch (err) {
			console.error("create vault failed", err);
			setError(Messages.sync.members_action_error);
		} finally {
			setBusy(false);
		}
	};

	const onConfirmDelete = async () => {
		if (!confirmDelete) return;
		setBusy(true);
		setError(null);
		try {
			await apiDeleteVault(confirmDelete.vaultId);
			setConfirmDelete(null);
			await refresh();
		} catch (err) {
			console.error("delete vault failed", err);
			setError(Messages.sync.members_action_error);
		} finally {
			setBusy(false);
		}
	};

	if (!error && !vaults) return null;

	const totalVaults = vaults?.length ?? 0;

	return (
		<section className="rounded-lg border border-background-700 bg-background-900 p-5 md:p-6">
			<VerticalSpace testId="vaultSwitcherSection">
				<h3 className="text-base font-semibold">
					{Messages.sync.vault_switcher_title}
				</h3>
				<p className="text-sm opacity-80">
					{Messages.sync.vault_switcher_description}
				</p>
				{error && <Status type="error">{error}</Status>}
				{vaults && (
					<ul className="flex flex-col gap-2">
						{vaults.map((v) => {
							const isCurrent = v.vaultId === management.vaultId;
							const isRenaming = renaming === v.vaultId;
							const canDelete =
								v.role === "owner" && !isCurrent && totalVaults > 1;
							return (
								<li
									key={v.vaultId}
									data-testid={`vault-${v.vaultId}`}
									className={`flex items-center justify-between gap-2 rounded border p-2 ${isCurrent ? "border-primary-500 bg-background-800" : "border-background-700 bg-background-900"}`}
								>
									<div className="flex flex-col flex-1 min-w-0">
										{isRenaming ? (
											<Input
												testId={`vault-rename-input-${v.vaultId}`}
												value={renameValue}
												placeholder={v.name}
												onChange={setRenameValue}
												containerArea
												immediate
											/>
										) : (
											<span
												className="text-sm font-medium"
												data-testid={`vault-name-${v.vaultId}`}
											>
												{v.name}
											</span>
										)}
										<span className="text-xs opacity-70">
											{v.role === "owner"
												? Messages.sync.role_owner
												: Messages.sync.role_member}
											{" · "}
											{Messages.sync.vault_switcher_created}:{" "}
											{formatDate(v.createdAt)}
											{isCurrent && (
												<>
													{" · "}
													<span className="text-primary-400">
														{Messages.sync.vault_switcher_current}
													</span>
												</>
											)}
										</span>
									</div>
									<div className="flex gap-2">
										{v.role === "owner" &&
											(isRenaming ? (
												<>
													<SecondaryButton
														onClick={() => {
															setRenaming(null);
															setRenameValue("");
														}}
														title={Messages.util.cancel}
														disabled={busy}
														compact
													/>
													<OkButton
														testId={`vault-rename-save-${v.vaultId}`}
														onClick={() => onSaveRename(v.vaultId)}
														title={Messages.util.save}
														disabled={busy || renameValue.trim().length === 0}
													/>
												</>
											) : (
												<SecondaryButton
													testId={`vault-rename-${v.vaultId}`}
													onClick={() => {
														setRenaming(v.vaultId);
														setRenameValue(v.name);
													}}
													title={Messages.sync.vault_rename}
													compact
												/>
											))}
										{canDelete && !isRenaming && (
											<DeleteButton
												testId={`vault-delete-${v.vaultId}`}
												onClick={() => setConfirmDelete(v)}
												disabled={busy}
											>
												<span className="px-1">{Messages.util.delete}</span>
											</DeleteButton>
										)}
										{!isCurrent && !isRenaming && (
											<OkButton
												testId={`select-vault-${v.vaultId}`}
												onClick={() => selectVaultForTabAndReload(v.vaultId)}
												title={Messages.sync.vault_switcher_use}
											/>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				)}
				{creating ? (
					<div className="flex flex-wrap items-end gap-2">
						<div className="flex-1 min-w-[12rem]">
							<Input
								testId="vault-create-input"
								value={createValue}
								placeholder={Messages.sync.vault_create_placeholder}
								onChange={setCreateValue}
								containerArea
								immediate
							/>
						</div>
						<SecondaryButton
							onClick={() => {
								setCreating(false);
								setCreateValue("");
							}}
							title={Messages.util.cancel}
							disabled={busy}
							compact
						/>
						<OkButton
							testId="vault-create-confirm"
							onClick={onCreate}
							title={Messages.sync.vault_create}
							disabled={busy}
						/>
					</div>
				) : (
					<div>
						<SecondaryButton
							testId="vault-create"
							onClick={() => setCreating(true)}
							title={Messages.sync.vault_create_new}
						/>
					</div>
				)}
				{confirmDelete && (
					<div
						data-testid="confirm-vault-delete"
						className="rounded border border-danger-700 bg-background-900 p-3"
					>
						<p className="mb-2 text-sm">
							{Messages.sync.vault_delete_confirm}{" "}
							<span className="font-mono">{confirmDelete.name}</span>
						</p>
						<div className="flex gap-2">
							<SecondaryButton
								onClick={() => setConfirmDelete(null)}
								title={Messages.util.cancel}
								disabled={busy}
							/>
							<DeleteButton
								testId="confirm-vault-delete-button"
								onClick={onConfirmDelete}
								disabled={busy}
							>
								<span className="px-1">{Messages.util.delete}</span>
							</DeleteButton>
						</div>
					</div>
				)}
			</VerticalSpace>
		</section>
	);
});
