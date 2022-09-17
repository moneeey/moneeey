import './App.css'
import 'antd/dist/antd.dark.css'

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
import { TourProvider } from '@reactour/tour'
import MoneeeyTourSteps from './shared/MoneeeyTourSteps'
import { TagsHighlightProvider } from './components/Tags'

export const App = observer(() => {
  const [moneeeyStore] = React.useState(new MoneeeyStore())

  return (
    <div className="App">
      <BrowserRouter>
        <TourProvider steps={MoneeeyTourSteps(moneeeyStore)}>
          <MoneeeyStoreProvider value={moneeeyStore}>
            {moneeeyStore.config.loaded ? (
              <TagsHighlightProvider>
                <AppMenu />
                <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
                <Navigator />
                <Modals />
              </TagsHighlightProvider>
            ) : (
              <p>{Messages.util.loading}</p>
            )}
          </MoneeeyStoreProvider>
        </TourProvider>
      </BrowserRouter>
    </div>
  )
})

export default App
