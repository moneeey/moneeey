import React, { ReactNode, useEffect, useState } from "react";

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
import Select from "./components/base/Select";
import { TCurrencyUUID } from "./entities/Currency";

const MinimalBasicScreen = ({ children }: { children: ReactNode }) => {
	const Messages = useMessages();
	return (
		<div className="flex justify-center items-center min-h-screen">
			<div className="flex flex-col items-center gap-4 scale-150 pb-32">
				<h1 className="flex flex-row gap-2 scale-150 pb-4">
					<FavIcon /> {Messages.menu.title}
				</h1>
				{children}
			</div>
		</div>
	);
};

const InitialLanguageSelector = () => {
	const [language, setLanguage] = useState(LanguageUnset);
	const { selectLanguage, messagesForLanguage } = useLanguageSwitcher();
	const Messages = messagesForLanguage(language);
	return (
		<MinimalBasicScreen>
			<LanguageSelector onSelect={(selected) => setLanguage(selected)} />
			{language !== LanguageUnset && (
				<OkButton
					title={Messages.tour.continue_language}
					onClick={() => selectLanguage(language)}
				/>
			)}
		</MinimalBasicScreen>
	);
};

const InitialCurrencySelector = () => {
	const [defaultCurrency, setDefaultCurrency] = useState("" as TCurrencyUUID);
	const { currencies, config } = useMoneeeyStore();
	const Messages = useMessages();
	return (
		<MinimalBasicScreen>
			<p>{Messages.settings.default_currency}</p>
			<Select
				testId="defaultCurrencySelector"
				placeholder={Messages.settings.select_default_currency}
				value={defaultCurrency}
				options={currencies.all.map((currency) => ({
					label: (
						<span>
							<b>{currency.short}</b> {currency.name}
						</span>
					),
					value: currency.currency_uuid,
				}))}
				onChange={(value: string) => setDefaultCurrency(value)}
			/>
			{defaultCurrency !== "" && (
				<OkButton
					title={Messages.tour.continue_currency}
					onClick={() => {
						config.merge({ ...config.main, default_currency: defaultCurrency });
					}}
				/>
			)}
		</MinimalBasicScreen>
	);
};

const AppContent = observer(() => {
	const Messages = useMessages();
	const { currentLanguage } = useLanguageSwitcher();

	const moneeeyStore = useMoneeeyStore();
	const { loaded, config, accounts } = moneeeyStore;

	if (!loaded) return <p>{Messages.util.loading}</p>;

	if (currentLanguage === LanguageUnset) {
		return <InitialLanguageSelector />;
	}

	if (config.main.default_currency === "") {
		return <InitialCurrencySelector />;
	}
	// check if initialized is set, otherwise:
	// 1. request user language
	// 2. check if user wants to login/couchdb database
	// 3. if user selects new account/empty database, request for encryption password
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
