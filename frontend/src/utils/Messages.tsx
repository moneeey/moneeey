import React, { type ReactNode } from "react";

import Language from "./Language";
import { StorageKind, getStorage, identity, setStorage } from "./Utils";

export const LanguageUnset: LanguageCode = "unset";

type RealLanguageCode = keyof typeof Language.menu.title;
export type LanguageCode = keyof typeof Language.menu.title | "unset";

type ExtractSingleLanguage<T> = {
	[K in keyof T]: {
		[P in keyof T[K]]: T[K][P] extends Record<RealLanguageCode, infer V>
			? V
			: never;
	};
};

function LanguageForCode<L extends LanguageCode>(
	code: L,
): ExtractSingleLanguage<typeof Language> {
	if (code === "unset") {
		return LanguageForCode("en");
	}
	return Object.fromEntries(
		Object.entries(Language).map(([category, entries]) => [
			category,
			Object.fromEntries(
				Object.entries(entries).map(([key, value]) => [
					key,
					(value as Record<LanguageCode, unknown>)[code],
				]),
			),
		]),
	) as ExtractSingleLanguage<typeof Language>;
}

export type TMessages = ReturnType<typeof LanguageForCode>;

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
	return LanguageForCode(React.useContext(MessagesContext).currentLanguage);
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
			return LanguageForCode(code);
		},
	};
}
export type LanguageSwitcher = ReturnType<typeof useLanguageSwitcher>;
