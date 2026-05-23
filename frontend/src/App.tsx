import { useCallback, useEffect, useMemo, useState } from "react";

import { observer } from "mobx-react";

import { HashRouter, Route, Routes } from "react-router-dom";

import AppMenu from "./components/AppMenu";
import Navigator from "./components/Navigator";
import Notifications from "./components/Notifications";
import type { UnlockResult } from "./components/tour/EncryptionGate";
import MoneeeyStore from "./shared/MoneeeyStore";
import { LocalStore } from "./shared/storage/LocalStore";
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
	const [localStoreReady, setLocalStoreReady] = useState(false);
	const localStore = useMemo(() => new LocalStore(), []);

	useEffect(() => {
		let cancelled = false;
		localStore.open().then(() => {
			if (!cancelled) setLocalStoreReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, [localStore]);

	const onUnlocked = useCallback(
		async ({ dataKey, syncConfig }: UnlockResult) => {
			const store = new MoneeeyStore(localStore);
			store.persistence.setDataKey(dataKey);
			await store.load();
			if (syncConfig) {
				store.config.merge({
					...store.config.main,
					moneeeySync: syncConfig,
				});
				store.persistence.sync(syncConfig);
			}
			setMoneeeyStore(store);
		},
		[localStore],
	);

	if (showInitialLanguageSelector({ currentLanguage })) {
		return <InitialLanguageSelector />;
	}

	if (!localStoreReady) {
		return <AppLoading />;
	}

	if (!moneeeyStore) {
		return <EncryptionGate store={localStore} onUnlocked={onUnlocked} />;
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
