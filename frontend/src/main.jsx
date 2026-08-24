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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
