import './App.css';
import 'antd/dist/antd.css';

import React from 'react';

import AppMenu from './app/AppMenu';
import RouteRenderer from './app/RouteRenderer';
import { TagsHighlightProvider } from './app/Tags';
import { HomeRoute } from './routes/HomeRouter';
import MoneeeyStore from './shared/MoneeeyStore';
import { MoneeeyStoreProvider } from './shared/useMoneeeyStore';

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  return (
    <div className='App'>
      <MoneeeyStoreProvider value={moneeeyStore}>
        <TagsHighlightProvider>
          <AppMenu />
          <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
        </TagsHighlightProvider>
      </MoneeeyStoreProvider>
    </div>
  );
}

export default App;
