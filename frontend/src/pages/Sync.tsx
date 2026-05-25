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
import { Input } from "../components/base/Input";
import { VerticalSpace } from "../components/base/Space";
import {
	createInviteLink,
	loginPasskey,
	registerPasskey,
} from "../shared/encryption/bootstrapFromPasskey";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";
import { MembersSection } from "./MembersSection";
import { VaultSwitcherSection } from "./VaultSwitcherSection";

export const MoneeeyLogin = ({
	setMessage,
}: { setMessage: Dispatch<SetStateAction<ReactElement | undefined>> }) => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [displayName, setDisplayName] = useState("");

	const onLogin = async () => {
		try {
			const syncConfig = await loginPasskey();
			management.complete(syncConfig.sessionToken, syncConfig.vaultId);
			setMessage(<Status type="info">{Messages.sync.login_success}</Status>);
		} catch (_err) {
			setMessage(<Status type="error">{Messages.sync.login_error}</Status>);
		}
	};

	const onRegister = async () => {
		const name = displayName.trim();
		if (name.length === 0) {
			setMessage(
				<Status type="error">
					{Messages.encryption.display_name_required}
				</Status>,
			);
			return;
		}
		try {
			const syncConfig = await registerPasskey(name);
			management.complete(syncConfig.sessionToken, syncConfig.vaultId);
			setMessage(<Status type="info">{Messages.sync.login_success}</Status>);
		} catch (_err) {
			setMessage(<Status type="error">{Messages.sync.login_error}</Status>);
		}
	};

	return (
		<VerticalSpace>
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
						label: Messages.encryption.display_name_label,
						editor: (
							<Input
								testId="displayName"
								type="text"
								autoComplete="username"
								immediate
								value={displayName}
								placeholder={Messages.encryption.display_name_placeholder}
								onChange={(value) => setDisplayName(value)}
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
		</VerticalSpace>
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
		<VerticalSpace testId="inviteSection">
			<h3 className="text-base font-semibold">{Messages.sync.invite_create}</h3>
			<p className="text-sm opacity-80">
				{Messages.sync.invite_share_description}
			</p>
			<div>
				<OkButton onClick={onGenerate} title={Messages.sync.invite_create} />
			</div>
			{inviteUrl && (
				<>
					<Input
						testId="inviteUrl"
						readOnly
						value={inviteUrl}
						placeholder=""
						containerArea
						onChange={() => {}}
					/>
					<div>
						<SecondaryButton
							onClick={onCopy}
							title={
								copied ? Messages.sync.invite_copied : Messages.sync.invite_copy
							}
						/>
					</div>
				</>
			)}
		</VerticalSpace>
	);
};

const SectionCard = ({ children }: { children: React.ReactNode }) => (
	<section className="rounded-lg border border-background-700 bg-background-900 p-5 md:p-6">
		{children}
	</section>
);

export const MoneeeyAccountConfig = observer(() => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [message, setMessage] = useState(undefined as ReactElement | undefined);
	const { loggedIn } = management;

	const onLogout = () => management.logout();

	return (
		<VerticalSpace>
			{message}
			{loggedIn ? (
				<>
					<VaultSwitcherSection />
					<SectionCard>
						<MembersSection />
					</SectionCard>
					<SectionCard>
						<InviteSection />
					</SectionCard>
					<div>
						<SecondaryButton onClick={onLogout} title={Messages.login.logout} />
					</div>
				</>
			) : (
				<MoneeeyLogin setMessage={setMessage} />
			)}
		</VerticalSpace>
	);
});

export default function Sync() {
	const Messages = useMessages();

	return (
		<div className="bg-background-800 p-4 md:p-6">
			<p className="white-space-preline mb-4 text-sm opacity-80">
				{Messages.sync.intro}
			</p>
			<MoneeeyAccountConfig />
		</div>
	);
}
