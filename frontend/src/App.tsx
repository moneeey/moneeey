import React, { useEffect, useState } from "react";

import { observer } from "mobx-react";

import { HashRouter } from "react-router-dom";

import AppMenu from "./components/AppMenu";
import Navigator from "./components/Navigator";
import Notifications from "./components/Notifications";
import MoneeeyStore from "./shared/MoneeeyStore";
import useMoneeeyStore, {
	MoneeeyStoreProvider,
} from "./shared/useMoneeeyStore";

import { TagsHighlightProvider } from "./components/Tags";
import Modals from "./components/modal/Modals";
import MoneeeyTourProvider from "./components/tour/Tour";

import { PouchDBFactory } from "./shared/Persistence";
import useMessages, {
	LanguageUnset,
	MessagesProvider,
	useLanguageSwitcher,
} from "./utils/Messages";
import LanguageSelector from "./components/LanguageSelector";
import { OkButton } from "./components/base/Button";
import { FavIcon } from "./components/base/Icon";

const InitialLanguageSelector = () => {
	const [language, setLanguage] = useState(LanguageUnset);
	const { selectLanguage, currentLanguage, messagesForLanguage } =
		useLanguageSwitcher();
	const Messages = messagesForLanguage(language);
	return (
		currentLanguage === LanguageUnset && (
			<div className="flex justify-center items-center min-h-screen">
				<div className="flex flex-col items-center gap-4 scale-150 pb-32">
					<h1 className="flex flex-row gap-2 scale-150 pb-4">
						<FavIcon /> {Messages.menu.title}
					</h1>
					<LanguageSelector onSelect={(selected) => setLanguage(selected)} />
					{language !== LanguageUnset && (
						<OkButton
							title={Messages.tour.continue_language}
							onClick={() => selectLanguage(language)}
						/>
					)}
				</div>
			</div>
		)
	);
};

const AppContent = observer(() => {
	const Messages = useMessages();
	const { currentLanguage } = useLanguageSwitcher();

	const moneeeyStore = useMoneeeyStore();
	const { loaded } = moneeeyStore;

	if (!loaded) return <p>{Messages.util.loading}</p>;
	if (currentLanguage === LanguageUnset) {
		return <InitialLanguageSelector />;
	}
	return <AppMenu moneeeyStore={moneeeyStore} />;
});

export const App = () => {
	const moneeeyStore = React.useMemo(
		() => new MoneeeyStore(PouchDBFactory),
		[],
	);

	useEffect(() => {
		moneeeyStore.load();
	}, [moneeeyStore]);

	return (
		<HashRouter>
			<MessagesProvider>
				<MoneeeyStoreProvider value={moneeeyStore}>
					<MoneeeyTourProvider>
						<TagsHighlightProvider>
							<AppContent />
							<Navigator />
							<Modals />
							<Notifications />
						</TagsHighlightProvider>
					</MoneeeyTourProvider>
				</MoneeeyStoreProvider>
			</MessagesProvider>
		</HashRouter>
	);
};

export default App;
