import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import useMessages from "../utils/Messages";
import usePrivacyMode, { setPrivacyMode } from "../utils/usePrivacyMode";
import SegmentedControl from "./base/SegmentedControl";

export default function PrivacyModeSwitcher() {
	const Messages = useMessages();
	const privacy = usePrivacyMode();

	return (
		<div className="flex flex-col items-center gap-1.5">
			<span className="text-xs uppercase tracking-wider text-muted font-medium">
				{Messages.settings.privacy_mode}
			</span>
			<SegmentedControl
				testId="privacyModeSwitcher"
				value={privacy ? "enabled" : "disabled"}
				onChange={(val) => setPrivacyMode(val === "enabled")}
				size="sm"
				options={[
					{
						value: "disabled",
						icon: <EyeIcon className="w-4 h-4" />,
						label: Messages.settings.privacy_mode_disabled,
					},
					{
						value: "enabled",
						icon: <EyeSlashIcon className="w-4 h-4" />,
						label: Messages.settings.privacy_mode_enabled,
					},
				]}
			/>
		</div>
	);
}
