import React, { type ReactNode } from "react";

import Language, { type LanguageCode, type LanguageType } from "./Language";
import { StorageKind, getStorage, identity, setStorage } from "./Utils";

export const LanguageUnset: LanguageCode = "unset";

export type TMessages = LanguageType;

const MessagesContext = React.createContext({
	currentLanguage: LanguageUnset as LanguageCode,
	selectLanguage: (code: LanguageCode) => identity(code),
});

export function MessagesProvider({ children }: { children: ReactNode }) {
	const storedLanguage = getStorage(
		"language",
		LanguageUnset,
		StorageKind.PERMANENT,
	) as LanguageCode;
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
	return Language(React.useContext(MessagesContext).currentLanguage);
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
		selectLanguage(code: LanguageCode) {
			setStorage("language", code, StorageKind.PERMANENT);
			selectLanguage(code);
		},
		messagesForLanguage(code: LanguageCode) {
			return Language(code);
		},
	};
}
export type LanguageSwitcher = ReturnType<typeof useLanguageSwitcher>;
