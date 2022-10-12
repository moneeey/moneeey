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
import { MoneeeyStoreProvider } from './shared/useMoneeeyStore';
import Messages from './utils/Messages';

import Modals from './components/modal/Modals';
import { TagsHighlightProvider } from './components/Tags';
import MoneeeyTourProvider from './components/tour/Tour';

import { PouchDBFactory } from './shared/Persistence';

export const App = observer(() => {
  const [moneeeyStore] = React.useState(new MoneeeyStore(PouchDBFactory));

  return (
    <div className='App'>
      <BrowserRouter>
        <MoneeeyStoreProvider value={moneeeyStore}>
          {moneeeyStore.loaded ? (
            <MoneeeyTourProvider>
              <TagsHighlightProvider>
                <AppMenu />
                <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
                <Navigator />
                <Modals />
                <Notifications />
              </TagsHighlightProvider>
            </MoneeeyTourProvider>
          ) : (
            <p>{Messages.util.loading}</p>
          )}
        </MoneeeyStoreProvider>
      </BrowserRouter>
    </div>
  );
});

export default App;
