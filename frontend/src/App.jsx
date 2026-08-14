import React, { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import PostAd from './pages/PostAd.jsx';
import ChatList from './pages/ChatList.jsx';
import ChatThread from './pages/ChatThread.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Icon from './components/Icon.jsx';
import { AuthGateProvider } from './lib/authGate.jsx';
import { BACKEND_URL } from './lib/firebase';

export default function App() {
  // Fire-and-forget: wake the Render backend as soon as the Mini App
  // opens, during plain browsing — so by the time someone taps Post
  // an Ad / Chat / Call, the ~30s free-tier cold start has usually
  // already happened in the background instead of blocking them.
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});
  }, []);

  return (
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
        <BottomNav />
      </div>
    </AuthGateProvider>
  );
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
      <NavLink to="/post" className="nav-fab"><Icon name="plus" size={24} /></NavLink>
      {item('/dashboard', 'Dashboard', 'briefcase')}
      {item('/profile', 'Profile', 'user')}
    </nav>
  );
}
