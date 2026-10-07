import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { initTelegramApp } from './lib/telegram';
import { initVersionWatch } from './lib/appVersion';
import { initTheme } from './lib/theme';
import './styles/theme.css';

initTelegramApp();
initVersionWatch();
initTheme();

// Installable-app support, only outside Telegram (the Mini App never
// needs it, and we don't want a worker in Telegram's WebView).
if ('serviceWorker' in navigator && !window.Telegram?.WebApp?.initData) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
