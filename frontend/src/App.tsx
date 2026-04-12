import { useCallback, useMemo, useState } from "react";

import { observer } from "mobx-react";

import { HashRouter, Route, Routes } from "react-router-dom";

import AppMenu from "./components/AppMenu";
import Navigator from "./components/Navigator";
import Notifications from "./components/Notifications";
import type { UnlockResult } from "./components/tour/EncryptionGate";
import MoneeeyStore from "./shared/MoneeeyStore";
import { openRawDatabase } from "./shared/encryption/encryptedPouch";
import useMoneeeyStore, {
	MoneeeyStoreProvider,
} from "./shared/useMoneeeyStore";

import { TagsHighlightProvider } from "./components/Tags";
import Modals from "./components/modal/Modals";
import MoneeeyTourProvider from "./components/tour/Tour";

import { isEmpty } from "lodash";
import LandingPage from "./components/LandingPage";
import MinimalBasicScreen from "./components/base/MinimalBaseScreen";
import EncryptionGate from "./components/tour/EncryptionGate";
import InitialCurrencySelector, {
	showInitialCurrencySelector,
} from "./components/tour/InitialCurrencySelector";
import InitialLanguageSelector, {
	showInitialLanguageSelector,
} from "./components/tour/InitialLanguageSelector";
import { NavigationModal } from "./shared/Navigation";
import useMessages, {
	MessagesProvider,
	useLanguageSwitcher,
} from "./utils/Messages";
import { StorageKind, getStorage, setStorage } from "./utils/Utils";

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

const AppBoot = observer(() => {
	const { currentLanguage } = useLanguageSwitcher();
	const [moneeeyStore, setMoneeeyStore] = useState<MoneeeyStore | null>(null);
	const rawDb = useMemo(() => openRawDatabase(), []);

	const onUnlocked = useCallback(
		async ({ dataKey, syncConfig }: UnlockResult) => {
			const store = new MoneeeyStore(() => rawDb);
			store.persistence.setDataKey(dataKey);
			await store.load();
			if (syncConfig) {
				store.config.merge({
					...store.config.main,
					couchSync: syncConfig,
				});
				store.persistence.sync(syncConfig);
			}
			setMoneeeyStore(store);
		},
		[rawDb],
	);

	if (showInitialLanguageSelector({ currentLanguage })) {
		return <InitialLanguageSelector />;
	}

	if (!moneeeyStore) {
		return <EncryptionGate db={rawDb} onUnlocked={onUnlocked} />;
	}

	return (
		<MoneeeyStoreProvider value={moneeeyStore}>
			<AppContent />
		</MoneeeyStoreProvider>
	);
});

export const App = () => {
	return (
		<HashRouter>
			<MessagesProvider>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="*" element={<AppBoot />} />
				</Routes>
			</MessagesProvider>
		</HashRouter>
	);
};

export default App;
