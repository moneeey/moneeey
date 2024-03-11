import React, { ReactNode } from "react";

import LanguageEnglish from "./LanguageEnglish";
import LanguagePortuguese from "./LanguagePortuguese";
import LanguageSpanish from "./LanguageSpanish";
import { getStorage, identity, setStorage, StorageKind } from "./Utils";

export type TMessages = typeof LanguageEnglish;

const Languages = {
	english: LanguageEnglish,
	portuguese: LanguagePortuguese,
	spanish: LanguageSpanish,
};

export type AvailableLanguages = keyof typeof Languages;
const PrimaryLanguage: AvailableLanguages = "english";

const MessagesContext = React.createContext({
	currentLanguage: PrimaryLanguage as AvailableLanguages,
	selectLanguage: (language: AvailableLanguages) => identity(language),
});

export function MessagesProvider({ children }: { children: ReactNode }) {
	const storedLanguage = getStorage(
		"language",
		PrimaryLanguage,
		StorageKind.PERMANENT,
	) as AvailableLanguages;
	const [currentLanguage, selectLanguage] = React.useState(
		storedLanguage ?? PrimaryLanguage,
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
	};
}
