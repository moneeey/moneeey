import React, { useEffect } from 'react';

import { observer } from 'mobx-react';

import { BrowserRouter } from 'react-router-dom';

import AppMenu from './components/AppMenu';
import Navigator from './components/Navigator';
import Notifications from './components/Notifications';
import MoneeeyStore from './shared/MoneeeyStore';
import useMoneeeyStore, { MoneeeyStoreProvider } from './shared/useMoneeeyStore';

import Modals from './components/modal/Modals';
import { TagsHighlightProvider } from './components/Tags';
import MoneeeyTourProvider from './components/tour/Tour';

import { PouchDBFactory } from './shared/Persistence';
import initSw from './sw';
import useMessages, { MessagesProvider } from './utils/Messages';

const AppContent = observer(() => {
  const Messages = useMessages();
  const moneeeyStore = useMoneeeyStore();
  const { loaded } = moneeeyStore;

  return loaded ? <AppMenu moneeeyStore={moneeeyStore} /> : <p>{Messages.util.loading}</p>;
});

export const App = () => {
  const moneeeyStore = React.useMemo(() => new MoneeeyStore(PouchDBFactory), []);

  useEffect(() => {
    moneeeyStore.load();
  }, [moneeeyStore]);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

initSw();

export default App;
