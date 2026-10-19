import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import { openSupportChat } from './src/lib/chat';
import { getMyProfile } from './src/lib/profile';
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

export default function App() {
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
        return <DashboardScreen onBack={pop} onOpenBoost={() => push('boost')} />;
      default:
        return null;
    }
  }

  let screen;
  if (user === undefined) {
    screen = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F7052" />
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
        <View style={styles.tabBar}>
          <TabButton label="Home" active={tab === 'home'} onPress={() => setTab('home')} />
          <TabButton label="Messages" active={tab === 'chats'} onPress={() => setTab('chats')} />
          <TabButton label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} />
        </View>
      ) : null}
      <StatusBar style="dark" />
    </View>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" style={styles.tabButton}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 14,
    color: '#5F6368',
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#4F7052',
  },
});
