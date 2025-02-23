import type { ReactNode } from "react";
import useMessages, {
	type LanguageCode,
	useLanguageSwitcher,
} from "../utils/Messages";
import {
	IconBrazil,
	IconChina,
	IconIndia,
	IconSpain,
	IconUSA,
} from "./base/Icon";

type LanguageSelectorProps = {
	onSelect?: (language: LanguageCode) => void;
};

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
	const Messages = useMessages();
	const { currentLanguage, selectLanguage } = useLanguageSwitcher();
	const LangSelect = ({
		icon,
		language,
	}: { icon: ReactNode; language: LanguageCode }) => {
		const isCurrentLanguage = currentLanguage === language;
		const setCurrentLanguage = () => {
			if (onSelect) {
				return onSelect(language);
			}
			selectLanguage(language);
		};
		return (
			<i
				data-testid={`languageSelector_${language}`}
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
		<div className="flex flex-col justify-center gap-2">
			<p>{Messages.settings.select_language}</p>
			<div className="flex flex-row justify-end gap-4">
				<LangSelect icon={<IconUSA />} language="en" />
				<LangSelect icon={<IconChina />} language="cn" />
				<LangSelect icon={<IconIndia />} language="hi" />
				<LangSelect icon={<IconSpain />} language="es" />
				<LangSelect icon={<IconBrazil />} language="pt" />
			</div>
		</div>
	);
}
