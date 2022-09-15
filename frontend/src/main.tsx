import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import _ from 'lodash'

window._ = _

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
