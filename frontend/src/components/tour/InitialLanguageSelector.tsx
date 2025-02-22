import { useState } from "react";
import {
	type LanguageSwitcher,
	LanguageUnset,
	useLanguageSwitcher,
} from "../../utils/Messages";
import LanguageSelector from "../LanguageSelector";
import { OkButton } from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";

export function showInitialLanguageSelector({
	currentLanguage,
}: Pick<LanguageSwitcher, "currentLanguage">) {
	return currentLanguage === LanguageUnset;
}

export default function InitialLanguageSelector() {
	const [language, setLanguage] = useState(LanguageUnset);
	const { selectLanguage, messagesForLanguage } = useLanguageSwitcher();
	const Messages = messagesForLanguage(language);
	return (
		<MinimalBasicScreen>
			<LanguageSelector onSelect={(selected) => setLanguage(selected)} />
      <OkButton
        disabled={language === LanguageUnset}
        title={Messages.tour.continue_language}
        onClick={() => selectLanguage(language)}
      />
		</MinimalBasicScreen>
	);
}
