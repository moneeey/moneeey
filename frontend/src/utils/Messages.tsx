import React, { type ReactNode } from "react";

import LanguageEnglish from "./LanguageEnglish";
import LanguagePortuguese from "./LanguagePortuguese";
import LanguageSpanish from "./LanguageSpanish";
import { StorageKind, getStorage, identity, setStorage } from "./Utils";

export type TMessages = typeof LanguageEnglish;

const Languages = {
	unset: LanguageEnglish,
	english: LanguageEnglish,
	portuguese: LanguagePortuguese,
	spanish: LanguageSpanish,
};

export type AvailableLanguages = keyof typeof Languages;
export const LanguageUnset: AvailableLanguages = "unset";

const MessagesContext = React.createContext({
	currentLanguage: LanguageUnset as AvailableLanguages,
	selectLanguage: (language: AvailableLanguages) => identity(language),
});

export function MessagesProvider({ children }: { children: ReactNode }) {
	const storedLanguage = getStorage(
		"language",
		LanguageUnset,
		StorageKind.PERMANENT,
	) as AvailableLanguages;
	const [currentLanguage, selectLanguage] = React.useState(
		storedLanguage ?? LanguageUnset,
	);

	return (
		<MessagesContext.Provider
			value={{
				currentLanguage,
				selectLanguage: (lang) => selectLanguage(lang),
			}}
		>
			{children}
		</MessagesContext.Provider>
	);
}

export default function useMessages(): TMessages {
	return Languages[React.useContext(MessagesContext).currentLanguage];
}

export function WithMessages({
	children,
}: { children: (Messages: TMessages) => ReactNode }) {
	const Messages = useMessages();

	return <>{children(Messages)}</>;
}

export function useLanguageSwitcher() {
	const { selectLanguage, currentLanguage } = React.useContext(MessagesContext);
	return {
		currentLanguage,
		selectLanguage(language: AvailableLanguages) {
			setStorage("language", language, StorageKind.PERMANENT);
			selectLanguage(language);
		},
		messagesForLanguage(language: AvailableLanguages) {
			return Languages[language];
		},
	};
}
