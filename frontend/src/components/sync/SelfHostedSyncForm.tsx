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
