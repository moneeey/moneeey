import React, { useState } from 'react';

import { observer } from 'mobx-react';

import { BrowserRouter } from 'react-router-dom';

import { Bars3Icon } from '@heroicons/react/24/outline';

import favicon from '../favicon.svg';

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
import { TextTitle } from './components/base/Text';
import { Input } from './components/base/Input';
import { LinkButton } from './components/base/Button';

const Search = () => {
  const [search, setSearch] = useState('');

  return (
    <section className='searchArea'>
      {search && <LinkButton onClick={() => setSearch('')} title={Messages.util.clear} />}
      <Input data-test-id='search' placeholder={Messages.menu.search} onChange={setSearch} value={search} />
    </section>
  );
};

const AppContent = observer(() => {
  const moneeeyStore = useMoneeeyStore();
  const [menuExpanded, setMenuExpanded] = useState(true);

  return moneeeyStore.loaded ? (
    <section className='appContent'>
      <header>
        <TextTitle onClick={() => setMenuExpanded(!menuExpanded)}>
          <Bars3Icon />
          <img src={favicon} />
          {Messages.menu.title}
        </TextTitle>
        <Search />
      </header>
      <section>
        {menuExpanded && <AppMenu />}
        <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
      </section>
    </section>
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
            <AppContent />
            <Navigator />
            <Modals />
            <Notifications />
          </TagsHighlightProvider>
        </MoneeeyTourProvider>
      </MoneeeyStoreProvider>
    </BrowserRouter>
  );
};

export default App;
