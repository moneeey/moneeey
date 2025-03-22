import React, { useEffect } from "react";

import { observer } from "mobx-react";

import { HashRouter, Routes, Route } from "react-router-dom";

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

import { isEmpty } from "lodash";
import MinimalBasicScreen from "./components/base/MinimalBaseScreen";
import InitialCurrencySelector, {
	showInitialCurrencySelector,
} from "./components/tour/InitialCurrencySelector";
import InitialLanguageSelector, {
	showInitialLanguageSelector,
} from "./components/tour/InitialLanguageSelector";
import { NavigationModal } from "./shared/Navigation";
import { PouchDBFactory } from "./shared/Persistence";
import useMessages, {
	MessagesProvider,
	useLanguageSwitcher,
} from "./utils/Messages";
import { StorageKind, getStorage, setStorage } from "./utils/Utils";
import LandingPage from "./components/LandingPage";

const AppLoading = () => {
	const Messages = useMessages();
	return (
		<MinimalBasicScreen>
			<p>{Messages.util.loading}</p>
		</MinimalBasicScreen>
	);
};

const AppLoaded = observer(() => {
	const moneeeyStore = useMoneeeyStore();
	const {
		config: {
			main: { default_currency },
		},
		accounts: { all: allAccounts },
		navigation,
	} = moneeeyStore;
	const { currentLanguage } = useLanguageSwitcher();

	if (showInitialLanguageSelector({ currentLanguage })) {
		return <InitialLanguageSelector />;
	}

	// TODO: NewDB/MoneeySync/DBSync
	//// Setup encryption

	if (showInitialCurrencySelector({ default_currency })) {
		return <InitialCurrencySelector />;
	}

	if (isEmpty(allAccounts)) {
		navigation.openModal(NavigationModal.ADD_ACCOUNT);
	} else if (navigation.modal === NavigationModal.NONE) {
		if (getStorage("landing", "false", StorageKind.PERMANENT) !== "true") {
			setStorage("landing", "true", StorageKind.PERMANENT);
			navigation.openModal(NavigationModal.LANDING);
		}
	}

	return <AppMenu />;
});

const AppContent = observer(() => {
	const { loaded } = useMoneeeyStore();
	if (!loaded) {
		return <AppLoading />;
	}
	return (
		<MoneeeyTourProvider>
			<TagsHighlightProvider>
				<AppLoaded />
				<Navigator />
				<Modals />
				<Notifications />
			</TagsHighlightProvider>
		</MoneeeyTourProvider>
	);
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
					<Routes>
						<Route path="/" element={<LandingPage />} />
						<Route path="*" element={<AppContent />} />
					</Routes>
				</MoneeeyStoreProvider>
			</MessagesProvider>
		</HashRouter>
	);
};

export default App;
