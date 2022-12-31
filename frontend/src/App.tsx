import React from 'react';

import { observer } from 'mobx-react';

import { BrowserRouter } from 'react-router-dom';

import './App.less';

import AppMenu from './components/AppMenu';
import RouteRenderer from './routes/RouteRenderer';
import Navigator from './components/Navigator';
import Notifications from './components/Notifications';
import HomeRoute from './routes/HomeRouter';
import MoneeeyStore from './shared/MoneeeyStore';
import useMoneeeyStore, { MoneeeyStoreProvider } from './shared/useMoneeeyStore';
import Messages from './utils/Messages';

import Modals from './components/modal/Modals';
import { TagsHighlightProvider } from './components/Tags';
import MoneeeyTourProvider from './components/tour/Tour';

import { PouchDBFactory } from './shared/Persistence';

const LoadedApp = observer(() => {
  const moneeeyStore = useMoneeeyStore();

  return moneeeyStore.loaded ? (
    <>
      <AppMenu />
      <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
      <Navigator />
      <Modals />
      <Notifications />
    </>
  ) : (
    <p>{Messages.util.loading}</p>
  );
});

export const App = () => {
  const moneeeyStore = React.useMemo(() => new MoneeeyStore(PouchDBFactory), []);

  return (
    <BrowserRouter>
      <MoneeeyStoreProvider value={moneeeyStore}>
        <MoneeeyTourProvider>
          <TagsHighlightProvider>
            <LoadedApp />
          </TagsHighlightProvider>
        </MoneeeyTourProvider>
      </MoneeeyStoreProvider>
    </BrowserRouter>
  );
};

export default App;
