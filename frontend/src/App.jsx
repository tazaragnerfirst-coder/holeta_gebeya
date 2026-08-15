import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import PostAd from './pages/PostAd.jsx';
import ChatList from './pages/ChatList.jsx';
import ChatThread from './pages/ChatThread.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Icon from './components/Icon.jsx';
import { AuthGateProvider } from './lib/authGate.jsx';
import { AppDataProvider } from './lib/appData.jsx';
import { BACKEND_URL } from './lib/firebase';
import { getTelegramWebApp } from './lib/telegram';

export default function App() {
  // Fire-and-forget: wake the Render backend as soon as the Mini App
  // opens, during plain browsing — so by the time someone taps Post
  // an Ad / Chat / Call, the ~30s free-tier cold start has usually
  // already happened in the background instead of blocking them.
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});
  }, []);

  return (
    <AppDataProvider>
      <AuthGateProvider>
        <div className="app-shell">
          <div className="screen-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/post" element={<PostAd />} />
              <Route path="/chat" element={<ChatList />} />
              <Route path="/chat/:id" element={<ChatThread />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
          <TelegramBackButton />
          <ConditionalBottomNav />
        </div>
      </AuthGateProvider>
    </AppDataProvider>
  );
}

// An open chat thread takes over the full screen (fixed header +
// input, only the message list scrolls) — the bottom nav would just
// sit awkwardly on top of the input row, so it's hidden there.
//
// It's also hidden any time a text field is focused anywhere in the
// app (search box, post-ad form, etc.) — on mobile, the on-screen
// keyboard resizes the viewport and a fixed bottom nav would ride up
// and float in the middle of the screen alongside it otherwise.
function ConditionalBottomNav() {
  const { pathname } = useLocation();
  const inThread = /^\/chat\/.+/.test(pathname);
  const inProduct = /^\/product\/.+/.test(pathname);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    function isTextField(el) {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }
    function onFocusIn(e) { if (isTextField(e.target)) setKeyboardOpen(true); }
    function onFocusOut(e) { if (isTextField(e.target)) setKeyboardOpen(false); }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (inThread || inProduct || keyboardOpen) return null;
  return <BottomNav />;
}

// Telegram's own hardware/gesture back gesture closes the whole Mini
// App unless we claim it via the native BackButton API. Whenever
// we're not on Home, show it and route its tap through React
// Router's own back navigation — so phone-back behaves exactly like
// tapping our in-page back arrow, instead of exiting the app.
function TelegramBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg?.BackButton) return;

    if (pathname === '/') {
      tg.BackButton.hide();
      return;
    }

    function handleBack() {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
    }

    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);
    return () => tg.BackButton.offClick(handleBack);
  }, [pathname, navigate]);

  return null;
}

function BottomNav() {
  const item = (to, label, icon) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={to === '/'}>
      <Icon name={icon} size={24} />
      <span>{label}</span>
    </NavLink>
  );
  return (
    <nav className="bottom-nav">
      {item('/', 'Home', 'home')}
      {item('/chat', 'Chat', 'chat')}
      <div className="nav-space-holder"></div>
      {item('/dashboard', 'Dashboard', 'briefcase')}
      {item('/profile', 'Profile', 'user')}
      <div className="nav-fab-wrapper">
        <NavLink to="/post" className="nav-fab"><Icon name="plus" size={24} /></NavLink>
      </div>
    </nav>
  );
}
