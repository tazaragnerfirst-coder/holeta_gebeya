import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import { openSupportChat } from './src/lib/chat';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'chats', label: 'Messages', icon: 'chat' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  // undefined = still checking the saved session, null = logged out
  const [user, setUser] = useState(undefined);
  // Bottom tab: 'home', 'chats' or 'profile'
  const [tab, setTab] = useState('home');
  // Screens opened on top of the tabs, newest last. Back pops one, so
  // e.g. Saved listings -> a listing -> Back returns to Saved listings.
  const [stack, setStack] = useState([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const push = (name, params = {}) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => s.slice(0, -1));

  // Android back button follows the same stack.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) { pop(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length]);

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
        return <ListingDetailScreen item={top.params.item} onBack={pop} onOpenChat={openChat} />;
      case 'chat':
        return <ChatThreadScreen chat={top.params.chat} onBack={pop} />;
      case 'favorites':
        return <FavoritesScreen onBack={pop} onOpen={openListing} />;
      case 'editInfo':
        return <EditProfileScreen onBack={pop} />;
      case 'myAds':
        return <MyAdsScreen onBack={pop} onOpen={openListing} />;
      case 'store':
        return <StoreScreen onBack={pop} onOpen={openListing} />;
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
      case 'dashboard':
        return (
          <DashboardScreen
            onBack={pop}
            onOpenBoost={() => push('boost')}
            onOpenViews={() => push('views')}
            onOpenExpired={() => push('expired')}
            onOpenAds={() => push('myAds')}
          />
        );
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
    screen = <ChatListScreen onOpen={openChat} />;
  } else if (tab === 'profile') {
    screen = <ProfileScreen onNavigate={push} onOpenSupport={openSupport} />;
  } else {
    screen = <HomeScreen onOpen={openListing} />;
  }

  const showTabs = !!user && !top;

  return (
    <View style={styles.container}>
      <View style={styles.content}>{screen}</View>
      {showTabs ? (
        <View style={styles.navWrap} pointerEvents="box-none">
          <View style={styles.nav}>
            {TABS.map((t) => (
              <TabButton key={t.key} tab={t} active={tab === t.key} onPress={() => setTab(t.key)} />
            ))}
          </View>
        </View>
      ) : null}
      <StatusBar style="dark" />
    </View>
  );
}

function TabButton({ tab, active, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" style={[styles.navItem, active && styles.navItemActive]}>
      <Icon name={tab.icon} size={19} color={active ? colors.tgActiveInk : colors.inkFaint} weight={active ? 'fill' : 'regular'} />
      {active ? <Text style={styles.navLabel}>{tab.label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 58,
    backgroundColor: colors.tgBar,
    borderRadius: 100,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  navItemActive: {
    backgroundColor: colors.tgActive,
  },
  navLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontFamily: font.familyBold,
    color: colors.tgActiveInk,
  },
});
