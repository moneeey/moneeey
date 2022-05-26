import React from 'react';
import './App.css';
import 'antd/dist/antd.css';
import MoneeeyStore, { } from './shared/MoneeeyStore';
import { MoneeeyStoreProvider } from './useMoneeeyStore';
import { TagsHighlightProvider } from './app/Tags';
import { HomeRoute, LandingRoute } from './Routes';
import RouteRenderer from './app/RouteRenderer';
import Observe from './app/Observe';

function Moneeey({ moneeeyStore }: { moneeeyStore: MoneeeyStore }) {
  return (
    <MoneeeyStoreProvider value={moneeeyStore}>
      <TagsHighlightProvider>
        <Observe subjects={[moneeeyStore.management]}>
          {(_v: number) => (
          <RouteRenderer root_route={moneeeyStore.management.isLoggedIn ? HomeRoute : LandingRoute} app={{ moneeeyStore }} />
          )}
        </Observe>
      </TagsHighlightProvider>
    </MoneeeyStoreProvider>
  )
}

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  return (
    <div className="App">
      <Moneeey {...{ moneeeyStore }} />
    </div>
  );
}

export default App;
