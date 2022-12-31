import React from 'react';
import ReactDOM from 'react-dom/client';

import './polyfills';
import App from './App';

import './main.less';

ReactDOM.createRoot(document.querySelector('.App') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
