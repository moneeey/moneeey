import { useState } from "react";

import type { SyncConfig } from "../../entities/Config";
import useMessages from "../../utils/Messages";
import { BaseFormEditor } from "../FormEditor";
import { OkButton } from "../base/Button";
import { Input } from "../base/Input";

type Props = {
	initial?: SyncConfig;
	submitTitle: string;
	disabled?: boolean;
	onSubmit: (cfg: SyncConfig) => void;
};

/**
 * Reusable URL/username/password form for configuring a self-hosted
 * CouchDB sync target. Used by:
 *
 *   - `pages/Sync.tsx` — the post-unlock settings page, where the current
 *     values come from `config.main.couchSync`.
 *   - `components/tour/EncryptionGate.tsx` — the pre-unlock three-way
 *     chooser, where the form is fresh and `onSubmit` kicks off a one-shot
 *     pull to seed the local DB before the passphrase prompt.
 *
 * The form itself is controlled + stateless; the caller decides what
 * happens with the returned `SyncConfig` (merge into Config, call
 * `persistence.sync`, run a one-shot `db.sync`, etc.).
 */
export default function SelfHostedSyncForm({
	initial,
	submitTitle,
	disabled,
	onSubmit,
}: Props) {
	const Messages = useMessages();
	const [state, setState] = useState<SyncConfig>(
		initial || { url: "", username: "", password: "", enabled: true },
	);

	return (
		<BaseFormEditor
			testId="selfHostedSync"
			items={[
				{
					label: Messages.sync.couchdb_url,
					editor: (
						<Input
							testId="url"
							value={state.url}
							onChange={(value) => setState({ ...state, url: value })}
							placeholder="http://localhost:4280/db/mydatabase"
						/>
					),
				},
				{
					label: Messages.sync.couchdb_username,
					editor: (
						<Input
							testId="username"
							value={state.username}
							onChange={(value) => setState({ ...state, username: value })}
							placeholder={Messages.sync.couchdb_username}
						/>
					),
				},
				{
					label: Messages.sync.couchdb_password,
					editor: (
						<Input
							testId="password"
							value={state.password}
							onChange={(value) => setState({ ...state, password: value })}
							placeholder={Messages.sync.couchdb_password}
						/>
					),
				},
			]}
			footer={
				<OkButton
					onClick={() => onSubmit(state)}
					title={submitTitle}
					disabled={disabled}
				/>
			}
		/>
	);
}
