import './App.css'
import 'antd/dist/antd.dark.css'

import React from 'react'

import AppMenu from './components/AppMenu'
import RouteRenderer from './routes/RouteRenderer'
import { TagsHighlightProvider } from './components/Tags'
import { HomeRoute } from './routes/HomeRouter'
import MoneeeyStore from './shared/MoneeeyStore'
import { MoneeeyStoreProvider } from './shared/useMoneeeyStore'
import { observer } from 'mobx-react'
import Messages from './utils/Messages'

export const App = observer(() => {
  const [moneeeyStore] = React.useState(new MoneeeyStore())

  return (
    <div className="App">
      <MoneeeyStoreProvider value={moneeeyStore}>
        {moneeeyStore.config.loaded ? (
          <TagsHighlightProvider>
            <AppMenu />
            <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
          </TagsHighlightProvider>
        ) : (
          <p>{Messages.util.loading}</p>
        )}
      </MoneeeyStoreProvider>
    </div>
  )
})

export default App
