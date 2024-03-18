import type { ReactNode } from "react";
import useMessages, {
	type AvailableLanguages,
	useLanguageSwitcher,
} from "../utils/Messages";
import { IconBrazil, IconSpain, IconUSA } from "./base/Icon";

export default function LanguageSelector() {
	const Messages = useMessages();
	const { currentLanguage, selectLanguage } = useLanguageSwitcher();
	const LangSelect = ({
		icon,
		language,
	}: { icon: ReactNode; language: AvailableLanguages }) => {
		const isCurrentLanguage = currentLanguage === language;
		const setCurrentLanguage = () => selectLanguage(language);
		return (
			<i
				className={`inline-block h-6 w-6 rounded-xl hover:ring-2 ring-secondary-500 ${
					isCurrentLanguage ? "ring-2" : ""
				}`}
				onClick={setCurrentLanguage}
				onKeyDown={setCurrentLanguage}
			>
				{icon}
			</i>
		);
	};
	return (
		<div>
			<p>{Messages.settings.select_language}</p>
			<div className="flex flex-row justify-end pt-1 gap-2">
				<LangSelect icon={<IconBrazil />} language="portuguese" />
				<LangSelect icon={<IconUSA />} language="english" />
				<LangSelect icon={<IconSpain />} language="spanish" />
			</div>
		</div>
	);
}
