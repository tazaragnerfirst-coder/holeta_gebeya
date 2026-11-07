import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import { openSupportChat } from './src/lib/chat';
import { AppDataProvider, useAppData } from './src/lib/appData';
import { hydrateCache } from './src/lib/pageCache';
import { maybeOfferUpdate } from './src/lib/update';
import { getMyProfile } from './src/lib/profile';
import { colors, font } from './src/theme';
import Icon from './src/components/Icon';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatThreadScreen from './src/screens/ChatThreadScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import MyAdsScreen from './src/screens/MyAdsScreen';
import WalletScreen from './src/screens/WalletScreen';
import CoinScreen from './src/screens/CoinScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import BoostScreen from './src/screens/BoostScreen';
import StoreScreen from './src/screens/StoreScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ViewsDetailScreen from './src/screens/ViewsDetailScreen';
import ExpiredScreen from './src/screens/ExpiredScreen';
import PostTypeScreen from './src/screens/PostTypeScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Same four tabs, names and icons as the bot's BottomNav (frontend/src/App.jsx).
const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'chats', label: 'Chat', icon: 'chat' },
  { key: 'dashboard', label: 'Dashboard', icon: 'chartBar' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

// Screens that live under the Dashboard tab (bot: /dashboard/*), so the tab stays highlighted.
const DASHBOARD_SCREENS = ['views', 'expired', 'myAds'];
// Bot hides its nav on a chat thread and on a product page.
const NAV_HIDDEN_SCREENS = ['chat', 'listing'];

// Root: loads the saved cache from disk, tracks the login, and mounts the
// shared data layer ABOVE every screen (bot: AppDataProvider in main.jsx), so
// the feed, chats, ads, wallet… are already loading — or already on screen
// from last time — before any screen opens.
export default function App() {
  const [cacheReady, setCacheReady] = useState(false);
  // undefined = still checking the saved session, null = logged out
  const [user, setUser] = useState(undefined);

  useEffect(() => { hydrateCache().finally(() => setCacheReady(true)); }, []);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // The splash screen stays up until the cache is in memory (a few ms).
  if (!cacheReady) return null;
  return (
    <AppDataProvider uid={user === undefined ? undefined : (user ? user.uid : null)}>
      <AppShell user={user} />
    </AppDataProvider>
  );
}

function AppShell({ user }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  // Bottom tab: 'home', 'chats', 'dashboard' or 'profile'
  const [tab, setTab] = useState('home');
  // Screens opened on top of the tabs, newest last. Back pops one, so
  // e.g. Saved listings -> a listing -> Back returns to Saved listings.
  const [stack, setStack] = useState([]);

  // Total unread across conversations -> the dot on the Chat tab (same as the bot).
  const { chats } = useAppData();
  const uid = user ? user.uid : null;
  const totalUnread = useMemo(
    () => (uid && chats ? chats.reduce((sum, c) => sum + (c.unreadCount?.[uid] || 0), 0) : 0),
    [chats, uid],
  );

  // Bot hides the nav while a text field is focused (on-screen keyboard open).
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // In-app update: a small, throttled check a few seconds AFTER the first
  // screen is up (never at startup), and again when the app returns to the
  // foreground. Downloading only happens if the person agrees (lib/update.js).
  const [updateProgress, setUpdateProgress] = useState(null); // 0..1 while downloading
  const readyToCheck = user !== undefined;
  useEffect(() => {
    if (!readyToCheck) return undefined;
    const t = setTimeout(() => maybeOfferUpdate(setUpdateProgress), 5000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') maybeOfferUpdate(setUpdateProgress);
    });
    return () => { clearTimeout(t); sub.remove(); };
  }, [readyToCheck]);

  const push = (name, params = {}) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => s.slice(0, -1));

  // Android back button follows the same stack.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) { pop(); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab]);

  // Logging out clears any open screens.
  useEffect(() => {
    if (user === null) { setStack([]); setTab('home'); }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded && user !== undefined) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, user]);

  async function openSupport() {
    try {
      const profile = await getMyProfile(auth.currentUser.uid);
      const chat = await openSupportChat(auth.currentUser.uid, profile.name);
      push('chat', { chat });
    } catch (err) {
      Alert.alert("Couldn't open support", err.message || 'Please try again.');
    }
  }

  const top = stack[stack.length - 1];
  const openListing = (item) => push('listing', { item });
  const openChat = (chat) => push('chat', { chat });

  function renderTop() {
    switch (top.name) {
      case 'listing':
        return (
          <ListingDetailScreen
            key={top.params.item.id}
            item={top.params.item}
            onBack={pop}
            onOpen={openListing}
            onOpenChat={openChat}
            onOpenStore={(sellerId) => push('store', { sellerId })}
          />
        );
      case 'chat':
        return <ChatThreadScreen chat={top.params.chat} onBack={pop} onOpenListing={openListing} />;
      case 'favorites':
        return <FavoritesScreen onBack={pop} onOpen={openListing} />;
      case 'editInfo':
        return <EditProfileScreen onBack={pop} />;
      case 'myAds':
        return <MyAdsScreen onBack={pop} onOpen={openListing} />;
      case 'store':
        return <StoreScreen onBack={pop} onOpen={openListing} sellerId={top.params?.sellerId} />;
      case 'wallet':
        return <WalletScreen onBack={pop} />;
      case 'coin':
        return <CoinScreen onBack={pop} />;
      case 'subscription':
        return <SubscriptionScreen onBack={pop} onOpenWallet={() => push('wallet')} />;
      case 'boost':
        return <BoostScreen onBack={pop} onOpenWallet={() => push('wallet')} />;
      case 'settings':
        return <SettingsScreen onBack={pop} />;
      case 'privacy':
        return <PrivacyScreen onBack={pop} />;
      case 'post':
        return <PostTypeScreen onBack={pop} />;
      case 'views':
        return <ViewsDetailScreen onBack={pop} />;
      case 'expired':
        return <ExpiredScreen onBack={pop} />;
      default:
        return null;
    }
  }

  if (!fontsLoaded) return null;

  let screen;
  if (user === undefined) {
    screen = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (user === null) {
    screen = <LoginScreen />;
  } else if (top) {
    screen = renderTop();
  } else if (tab === 'chats') {
    screen = <ChatListScreen onOpen={openChat} onOpenSupport={openSupport} />;
  } else if (tab === 'dashboard') {
    screen = (
      <DashboardScreen
        onOpenBoost={() => push('boost')}
        onOpenViews={() => push('views')}
        onOpenExpired={() => push('expired')}
        onOpenAds={() => push('myAds')}
      />
    );
  } else if (tab === 'profile') {
    screen = <ProfileScreen onNavigate={push} onOpenSupport={openSupport} />;
  } else {
    screen = <HomeScreen onOpen={openListing} />;
  }

  const showTabs = !!user && !keyboardOpen && !(top && NAV_HIDDEN_SCREENS.includes(top.name));
  // Which tab is highlighted: the open tab, or (on a pushed screen) the tab it belongs to.
  const activeTab = !top ? tab : (DASHBOARD_SCREENS.includes(top.name) ? 'dashboard' : null);
  const onPostPage = top?.name === 'post';

  function goTab(key) {
    setStack([]);
    setTab(key);
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>{screen}</View>
      {showTabs ? (
        <View style={styles.navWrap} pointerEvents="box-none">
          {!onPostPage ? (
            <Pressable
              onPress={() => push('post')}
              accessibilityRole="button"
              accessibilityLabel="Post"
              style={styles.fab}
            >
              <Icon name="plus" size={26} color={colors.white} />
            </Pressable>
          ) : null}
          <View style={styles.nav}>
            {TABS.map((t) => (
              <TabButton
                key={t.key}
                tab={t}
                active={activeTab === t.key}
                dot={t.key === 'chats' && totalUnread > 0}
                onPress={() => goTab(t.key)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {updateProgress !== null ? (
        <View style={styles.updateOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.updateText}>Downloading update… {Math.round(updateProgress * 100)}%</Text>
        </View>
      ) : null}
      <StatusBar style="dark" />
    </View>
  );
}

function TabButton({ tab, active, dot, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" style={[styles.navItem, active && styles.navItemActive]}>
      <View>
        <Icon name={tab.icon} size={22} color={active ? colors.tgActiveInk : colors.ink} />
        {dot ? <View style={styles.navDot} /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

// Values mirror .bottom-nav-wrap / .bottom-nav / .nav-item / .nav-fab in frontend/src/styles/theme.css.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  updateOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  updateText: { marginTop: 12, fontFamily: font.familySemiBold, fontSize: 14, color: colors.ink },
  content: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navWrap: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    height: 68, backgroundColor: colors.tgBar, borderRadius: 100, padding: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 4,
  },
  navItem: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', paddingHorizontal: 4, borderRadius: 100,
  },
  navItemActive: { backgroundColor: colors.tgActive },
  navLabel: { marginTop: 2, fontSize: 11, fontFamily: font.familyBold, color: colors.ink },
  navLabelActive: { color: colors.tgActiveInk },
  navDot: {
    position: 'absolute', top: -2, right: -5, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.tgBar,
  },
  fab: {
    position: 'absolute', right: 0, bottom: 68 + 12, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.tgAccent, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 8,
  },
});
