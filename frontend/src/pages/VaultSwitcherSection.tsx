import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Status } from "../components/Status";
import { OkButton } from "../components/base/Button";
import { VerticalSpace } from "../components/base/Space";
import {
	type VaultListItem,
	listMyVaults,
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

	useEffect(() => {
		let cancelled = false;
		listMyVaults()
			.then((vs) => {
				if (!cancelled) setVaults(vs);
			})
			.catch((err) => {
				console.error("vaults load failed", err);
				if (!cancelled) setError(Messages.sync.members_load_error);
			});
		return () => {
			cancelled = true;
		};
	}, [Messages.sync.members_load_error]);

	if (!error && (vaults === null || vaults.length < 2)) return null;

	return (
		<section className="rounded-lg border border-background-700 bg-background-900 p-4">
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
							return (
								<li
									key={v.vaultId}
									data-testid={`vault-${v.vaultId}`}
									className={`flex items-center justify-between gap-2 rounded border p-2 ${isCurrent ? "border-primary-500 bg-background-800" : "border-background-700 bg-background-900"}`}
								>
									<div className="flex flex-col">
										<span className="text-sm font-mono">{v.vaultId}</span>
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
									{!isCurrent && (
										<OkButton
											testId={`select-vault-${v.vaultId}`}
											onClick={() => selectVaultForTabAndReload(v.vaultId)}
											title={Messages.sync.vault_switcher_use}
										/>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</VerticalSpace>
		</section>
	);
});
