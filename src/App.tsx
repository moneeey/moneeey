import React from 'react';
import './App.css';
import 'antd/dist/antd.css';
import MoneeeyStore, { } from './shared/MoneeeyStore';
import { MoneeeyStoreProvider } from './useMoneeeyStore';
import { TagsHighlightProvider } from './app/Tags';
import RouteRenderer from './app/RouteRenderer';
import { HomeRoute, LandingRoute } from './Routes';
import { observer } from 'mobx-react';
import AppMenu from './app/AppMenu';

export const Moneeey = observer(({ moneeeyStore }: { moneeeyStore: MoneeeyStore }) => {
  const { management } = moneeeyStore
  const root_route = management.loggedIn ? HomeRoute : LandingRoute
  return (
    <MoneeeyStoreProvider value={moneeeyStore}>
      <TagsHighlightProvider>
        {management.loggedIn && <AppMenu />}
        <RouteRenderer root_route={root_route} app={{ moneeeyStore }} />
      </TagsHighlightProvider>
    </MoneeeyStoreProvider>
  )
})

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  return (
    <div className="App">
      <Moneeey {...{ moneeeyStore }} />
    </div>
  );
}

export default App;
