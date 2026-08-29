import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Icon from './components/Icon.jsx';
import { AuthGateProvider } from './lib/authGate.jsx';
import { AppDataProvider, useAppData } from './lib/appData.jsx';
import { BACKEND_URL } from './lib/firebase';
import { getTelegramWebApp } from './lib/telegram';
import PostProgressRing from './components/PostProgressRing.jsx';

// Home loads eagerly (it's the landing screen, needed immediately).
// Everything else splits into its own chunk and loads on first visit
// — trims the initial bundle for the common case of someone just
// browsing listings without ever opening Chat/Dashboard/Post.
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const PostAd = lazy(() => import('./pages/PostAd.jsx'));
const ChatList = lazy(() => import('./pages/ChatList.jsx'));
const ChatThread = lazy(() => import('./pages/ChatThread.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ViewsDetail = lazy(() => import('./pages/ViewsDetail.jsx'));
const ContactsDetail = lazy(() => import('./pages/ContactsDetail.jsx'));
const ViewAdDetail = lazy(() => import('./pages/ViewAdDetail.jsx'));
const AdsManage = lazy(() => import('./pages/AdsManage.jsx'));
const ExpiredItems = lazy(() => import('./pages/ExpiredItems.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Favorites = lazy(() => import('./pages/Favorites.jsx'));
const SubscriptionStatus = lazy(() => import('./pages/SubscriptionStatus.jsx'));
const BoostPromo = lazy(() => import('./pages/BoostPromo.jsx'));
const MyStore = lazy(() => import('./pages/MyStore.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const HoletaCoin = lazy(() => import('./pages/HoletaCoin.jsx'));

function RouteFallback() {
  return (
    <div className="page">
      <p className="helper-text">Loading...</p>
    </div>
  );
}

export default function App() {
  // Fire-and-forget: wake the Render backend as soon as the Mini App
  // opens, during plain browsing — so by the time someone taps Post
  // an Ad / Chat / Call, the ~30s free-tier cold start has usually
  // already happened in the background instead of blocking them.
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});
  }, []);

  // Product pages open as a sheet stacked on top of wherever the
  // user tapped it from (Home, Search, Favorites, a chat thread...),
  // instead of replacing that screen outright — closing it (pull
  // down, back button) should reveal that same screen underneath,
  // still exactly as it was.
  //
  // The trick: any in-app Link to /product/:id attaches
  // `state: { backgroundLocation: location }` (see openProduct() in
  // lib/nav.js). When that's present, the MAIN <Routes> keeps
  // rendering that background location (so e.g. Home stays mounted
  // underneath) while a SECOND, later-mounted <Routes> renders just
  // the /product/:id route on top of it as a full-screen panel.
  // A direct/shared link with no backgroundLocation (no prior
  // in-app screen to show underneath) just falls through to the
  // ordinary full-page route in the main <Routes> — there's nothing
  // to layer it over.
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <AppDataProvider>
      <AuthGateProvider>
        <div className="app-shell">
          <div className="screen-container">
            <Suspense fallback={<RouteFallback />}>
              <Routes location={backgroundLocation || location}>
                <Route path="/" element={<Home />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/post" element={<PostAd />} />
                <Route path="/edit/:id" element={<PostAd />} />
                <Route path="/chat" element={<ChatList />} />
                <Route path="/chat/:id" element={<ChatThread />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/views" element={<ViewsDetail />} />
                <Route path="/dashboard/views/:id" element={<ViewAdDetail />} />
                <Route path="/dashboard/contacts" element={<ContactsDetail />} />
                <Route path="/dashboard/ads" element={<AdsManage />} />
                <Route path="/dashboard/expired" element={<ExpiredItems />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/subscription" element={<SubscriptionStatus />} />
                <Route path="/boost" element={<BoostPromo />} />
                <Route path="/my-store" element={<MyStore />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/holeta-coin" element={<HoletaCoin />} />
              </Routes>
            </Suspense>
            {backgroundLocation && (
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/product/:id" element={<ProductDetail />} />
                </Routes>
              </Suspense>
            )}
          </div>
          <TelegramBackButton />
          <PostProgressRing />
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
  const { chats, registeredUid } = useAppData();
  // Sum of every conversation's unread count for this user — the
  // same total-unread badge pattern Telegram shows on its chat tab.
  const totalUnread = registeredUid
    ? chats.reduce((sum, c) => sum + (c.unreadCount?.[registeredUid] || 0), 0)
    : 0;

  const item = (to, label, icon, badge) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={to === '/'}>
      <span className="nav-icon-wrap">
        <Icon name={icon} size={24} />
        {badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
      </span>
      <span>{label}</span>
    </NavLink>
  );
  return (
    <nav className="bottom-nav">
      {item('/', 'Home', 'home')}
      {item('/chat', 'Chat', 'chat', totalUnread)}
      <div className="nav-space-holder"></div>
      {item('/dashboard', 'Dashboard', 'briefcase')}
      {item('/profile', 'Profile', 'user')}
      <div className="nav-fab-wrapper">
        <NavLink to="/post" className="nav-fab"><Icon name="plus" size={24} /></NavLink>
      </div>
    </nav>
  );
}
