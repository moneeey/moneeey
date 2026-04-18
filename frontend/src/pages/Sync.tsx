import { observer } from "mobx-react-lite";
import {
	type Dispatch,
	type ReactElement,
	type SetStateAction,
	useState,
} from "react";
import { BaseFormEditor } from "../components/FormEditor";
import { Status } from "../components/Status";
import { OkButton, SecondaryButton } from "../components/base/Button";
import Tabs from "../components/base/Tabs";
import SelfHostedSyncForm from "../components/sync/SelfHostedSyncForm";
import {
	createInviteLink,
	loginPasskey,
	registerPasskey,
} from "../shared/encryption/bootstrapFromPasskey";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

export const MoneeeyLogin = ({
	setMessage,
}: { setMessage: Dispatch<SetStateAction<ReactElement | undefined>> }) => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [state, setState] = useState({ email: "" });

	const onLogin = async () => {
		try {
			const syncConfig = await loginPasskey(state.email);
			management.complete(syncConfig.password, syncConfig.url);
			setMessage(<Status type="info">{Messages.sync.login_success}</Status>);
		} catch (_err) {
			setMessage(<Status type="error">{Messages.sync.login_error}</Status>);
		}
	};

	const onRegister = async () => {
		try {
			const syncConfig = await registerPasskey(state.email);
			management.complete(syncConfig.password, syncConfig.url);
			setMessage(<Status type="info">{Messages.sync.login_success}</Status>);
		} catch (_err) {
			setMessage(<Status type="error">{Messages.sync.login_error}</Status>);
		}
	};

	return (
		<>
			<p className="text-sm opacity-80">
				{Messages.encryption.passkey_description}
			</p>
			<a
				href="https://fidoalliance.org/passkeys/"
				target="_blank"
				rel="noreferrer noopener"
				className="text-xs underline opacity-70 hover:opacity-100"
			>
				{Messages.encryption.passkey_learn_more}
			</a>
			<BaseFormEditor
				testId="providedSync"
				items={[
					{
						label: Messages.login.email,
						editor: (
							<input
								data-testid="email"
								type="email"
								autoComplete="username webauthn"
								value={state.email}
								placeholder={Messages.login.email}
								onChange={(event) =>
									setState({ ...state, email: event.target.value })
								}
								className="w-full rounded bg-background-800 p-2 outline-none focus:ring-2 focus:ring-primary-500"
							/>
						),
					},
				]}
				footer={
					<div className="flex gap-2">
						<OkButton
							onClick={onLogin}
							title={Messages.encryption.passkey_login}
						/>
						<SecondaryButton
							onClick={onRegister}
							title={Messages.encryption.passkey_register}
						/>
					</div>
				}
			/>
		</>
	);
};

export const InviteSection = () => {
	const Messages = useMessages();
	const [inviteUrl, setInviteUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const onGenerate = async () => {
		try {
			const url = await createInviteLink();
			setInviteUrl(url);
			setCopied(false);
		} catch (err) {
			console.error("failed to create invite", err);
		}
	};

	const onCopy = async () => {
		if (!inviteUrl) return;
		await navigator.clipboard.writeText(inviteUrl);
		setCopied(true);
	};

	return (
		<div className="flex flex-col gap-2 mt-4">
			<p className="text-sm opacity-80">
				{Messages.sync.invite_share_description}
			</p>
			<OkButton onClick={onGenerate} title={Messages.sync.invite_create} />
			{inviteUrl && (
				<>
					<input
						readOnly
						value={inviteUrl}
						className="w-full rounded bg-background-800 p-2 outline-none"
					/>
					<SecondaryButton
						onClick={onCopy}
						title={
							copied ? Messages.sync.invite_copied : Messages.sync.invite_copy
						}
					/>
				</>
			)}
		</div>
	);
};

export const MoneeeyAccountConfig = observer(() => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [message, setMessage] = useState(undefined as ReactElement | undefined);
	const { loggedIn } = management;

	const onLogout = () => management.logout();

	return (
		<>
			{message}
			{loggedIn ? (
				<>
					<OkButton onClick={onLogout} title={Messages.login.logout} />
					<InviteSection />
				</>
			) : (
				<MoneeeyLogin setMessage={setMessage} />
			)}
		</>
	);
});

export const DatabaseConfig = () => {
	const Messages = useMessages();
	const { persistence, config } = useMoneeeyStore();
	const initialCfg = config.main.couchSync || {
		url: "",
		username: "",
		password: "",
		enabled: false,
	};
	const onSubmit = (cfg: {
		url: string;
		username: string;
		password: string;
	}) => {
		const newState = { ...cfg, enabled: true };
		config.merge({ ...config.main, couchSync: newState });
		persistence.sync(newState);
	};
	const onStop = () => {
		const newState = { ...initialCfg, enabled: false };
		config.merge({ ...config.main, couchSync: newState });
		persistence.sync(newState);
	};

	return (
		<div className="flex flex-col gap-2">
			<SelfHostedSyncForm
				initial={initialCfg}
				submitTitle={Messages.sync.start}
				onSubmit={onSubmit}
			/>
			{initialCfg.enabled && (
				<OkButton onClick={onStop} title={Messages.sync.stop} />
			)}
		</div>
	);
};

export default function Sync() {
	const Messages = useMessages();

	return (
		<div className="bg-background-800 p-2">
			<span className="white-space-preline">{Messages.sync.intro}</span>
			<Tabs
				testId="syncSettings"
				items={[
					{
						key: "moneeeyAccount",
						label: Messages.sync.moneeey_sync,
						children: <MoneeeyAccountConfig />,
					},
					{
						key: "database",
						label: Messages.sync.database_sync,
						children: <DatabaseConfig />,
					},
				]}
			/>
		</div>
	);
}
