import { observer } from "mobx-react-lite";
import {
	type Dispatch,
	type ReactElement,
	type SetStateAction,
	useState,
} from "react";
import { BaseFormEditor } from "../components/FormEditor";
import { Status } from "../components/Status";
import { OkButton } from "../components/base/Button";
import Tabs from "../components/base/Tabs";
import SelfHostedSyncForm from "../components/sync/SelfHostedSyncForm";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

const MoneeeyLogin = ({
	setMessage,
}: { setMessage: Dispatch<SetStateAction<ReactElement | undefined>> }) => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [state, setState] = useState({ email: "" });

	const onLogin = async () => {
		const success = await management.start(state.email);
		if (success) {
			setMessage(<Status type="info">{Messages.sync.login_started}</Status>);
		} else {
			setMessage(<Status type="error">{Messages.sync.login_error}</Status>);
		}
	};

	return (
		<BaseFormEditor
			testId="providedSync"
			items={[
				{
					label: Messages.login.email,
					editor: (
						<input
							data-testid="email"
							type="email"
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
				<OkButton onClick={onLogin} title={Messages.login.login_or_signup} />
			}
		/>
	);
};

const MoneeeyAccountConfig = observer(() => {
	const Messages = useMessages();
	const { management } = useMoneeeyStore();
	const [message, setMessage] = useState(undefined as ReactElement | undefined);
	const { loggedIn } = management;

	const onLogout = () => management.logout();

	return (
		<>
			{message}
			{loggedIn ? (
				<OkButton onClick={onLogout} title={Messages.login.logout} />
			) : (
				<MoneeeyLogin setMessage={setMessage} />
			)}
		</>
	);
});

const DatabaseConfig = () => {
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
