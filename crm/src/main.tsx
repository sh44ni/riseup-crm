import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installPreloadErrorHandler } from './lib/chunkReload';
import './index.css';

// Auto-reload when dynamic module chunk loading fails due to a new deployment
installPreloadErrorHandler();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
