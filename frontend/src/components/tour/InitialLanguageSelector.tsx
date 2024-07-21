import { useState } from "react";
import MinimalBasicScreen from "../base/MinimalBaseScreen";
import {
	LanguageSwitcher,
	LanguageUnset,
	useLanguageSwitcher,
} from "../../utils/Messages";
import { OkButton } from "../base/Button";
import LanguageSelector from "../LanguageSelector";

export function showInitialLanguageSelector({
	currentLanguage,
}: LanguageSwitcher) {
	return currentLanguage === LanguageUnset;
}

export default function InitialLanguageSelector() {
	const [language, setLanguage] = useState(LanguageUnset);
	const { selectLanguage, messagesForLanguage } = useLanguageSwitcher();
	const Messages = messagesForLanguage(language);
	return (
		<MinimalBasicScreen>
			<LanguageSelector onSelect={(selected) => setLanguage(selected)} />
			{language !== LanguageUnset && (
				<OkButton
					title={Messages.tour.continue_language}
					onClick={() => selectLanguage(language)}
				/>
			)}
		</MinimalBasicScreen>
	);
}
