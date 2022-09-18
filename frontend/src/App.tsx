import React from 'react'

import AppMenu from './components/AppMenu'
import RouteRenderer from './routes/RouteRenderer'
import Navigator from './components/Navigator'
import { HomeRoute } from './routes/HomeRouter'
import MoneeeyStore from './shared/MoneeeyStore'
import { MoneeeyStoreProvider } from './shared/useMoneeeyStore'
import { observer } from 'mobx-react'
import Messages from './utils/Messages'
import { BrowserRouter } from 'react-router-dom'
import Modals from './components/modal/Modals'
import { TagsHighlightProvider } from './components/Tags'
import MoneeeyTourProvider from './components/Tour'

import 'antd/dist/antd.dark.less'

import './App.less'

export const App = observer(() => {
  const [moneeeyStore] = React.useState(new MoneeeyStore())

  return (
    <div className="App">
      <BrowserRouter>
        <MoneeeyStoreProvider value={moneeeyStore}>
          {moneeeyStore.loaded ? (
            <MoneeeyTourProvider>
              <TagsHighlightProvider>
                <AppMenu />
                <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
                <Navigator />
                <Modals />
              </TagsHighlightProvider>
            </MoneeeyTourProvider>
          ) : (
            <p>{Messages.util.loading}</p>
          )}
        </MoneeeyStoreProvider>
      </BrowserRouter>
    </div>
  )
})

export default App
