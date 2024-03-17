import React, { useEffect } from "react";

import { observer } from "mobx-react";

import { BrowserRouter, HashRouter } from "react-router-dom";

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
import initSw from "./sw";
import useMessages, { MessagesProvider } from "./utils/Messages";

const AppContent = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { loaded } = moneeeyStore;

	return loaded ? (
		<AppMenu moneeeyStore={moneeeyStore} />
	) : (
		<p>{Messages.util.loading}</p>
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

initSw();

export default App;
