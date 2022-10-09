import React from 'react';
import ReactDOM from 'react-dom/client';

import './polyfills';
import App from './App';

import './main.less';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
