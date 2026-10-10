import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { initTelegramApp } from './lib/telegram';
import { initVersionWatch } from './lib/appVersion';
import { initTheme } from './lib/theme';
import { IS_NATIVE } from './lib/platform';
import NativeErrorScreen, { installNativeErrorOverlay } from './components/NativeErrorScreen.jsx';
import './styles/theme.css';

if (IS_NATIVE) installNativeErrorOverlay();
initTelegramApp();
// The APK ships its own copy of the app, so the web version reload is off there.
if (!IS_NATIVE) initVersionWatch();
initTheme();

// Installable-app support, only outside Telegram (the Mini App never
// needs it, and we don't want a worker in Telegram's WebView).
if ('serviceWorker' in navigator && !IS_NATIVE && !window.Telegram?.WebApp?.initData) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* The APK serves the bundled files from a local origin, where path
        URLs can't be resolved, so it uses hash URLs (/#/product/123). */}
    {IS_NATIVE
      ? <NativeErrorScreen><HashRouter><App /></HashRouter></NativeErrorScreen>
      : <BrowserRouter><App /></BrowserRouter>}
  </React.StrictMode>
);
