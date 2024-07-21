import React, { useEffect } from "react";

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
	MessagesProvider,
	useLanguageSwitcher,
} from "./utils/Messages";
import InitialLanguageSelector, {
	showInitialLanguageSelector,
} from "./components/tour/InitialLanguageSelector";
import InitialCurrencySelector, {
	showInitialCurrencySelector,
} from "./components/tour/InitialCurrencySelector";
import MinimalBasicScreen from "./components/base/MinimalBaseScreen";
import { NavigationModal } from "./shared/Navigation";
import { isEmpty } from "lodash";

const AppLoading = () => {
	const Messages = useMessages();
	return (
		<MinimalBasicScreen>
			<p>{Messages.util.loading}</p>
		</MinimalBasicScreen>
	);
};

const AppContent = observer(() => {
	const moneeeyStore = useMoneeeyStore();
	const languageSwitcher = useLanguageSwitcher();

	if (!moneeeyStore.loaded) {
		return <AppLoading />;
	}

	if (showInitialLanguageSelector(languageSwitcher)) {
		return <InitialLanguageSelector />;
	}

	// NewDB/MoneeySync/DBSync
	//// Setup encryption

	if (showInitialCurrencySelector(moneeeyStore)) {
		return <InitialCurrencySelector />;
	}

	if (isEmpty(moneeeyStore.accounts.all)) {
		moneeeyStore.navigation.openModal(NavigationModal.ADD_ACCOUNT);
	}

	// 4. move some Ui into the menu bar, like the "New import" or the "Merge accounts"
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
