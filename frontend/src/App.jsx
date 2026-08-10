import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import PostAd from './pages/PostAd.jsx';
import ChatList from './pages/ChatList.jsx';
import ChatThread from './pages/ChatThread.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Icon from './components/Icon.jsx';

export default function App() {
  return (
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
  );
}

function BottomNav() {
  const item = (to, label, icon) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={to === '/'}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </NavLink>
  );
  return (
    <nav className="bottom-nav">
      {item('/', 'Home', 'home')}
      {item('/chat', 'Chat', 'chat')}
      <NavLink to="/post" className="nav-fab"><Icon name="plus" size={22} /></NavLink>
      {item('/dashboard', 'Dashboard', 'briefcase')}
      {item('/profile', 'Profile', 'user')}
    </nav>
  );
}
