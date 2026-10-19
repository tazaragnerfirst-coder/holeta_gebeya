import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatThreadScreen from './src/screens/ChatThreadScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import MyAdsScreen from './src/screens/MyAdsScreen';

export default function App() {
  // undefined = still checking the saved session, null = logged out
  const [user, setUser] = useState(undefined);
  // Bottom tab: 'home', 'chats' or 'profile'
  const [tab, setTab] = useState('home');
  // Detail views opened on top of the tabs
  const [openListing, setOpenListing] = useState(null);
  const [openChat, setOpenChat] = useState(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [myAdsOpen, setMyAdsOpen] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Favorites stays open underneath, so Back from a saved listing returns to it.
  function closeListing() {
    setOpenListing(null);
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
  } else if (openChat) {
    screen = <ChatThreadScreen chat={openChat} onBack={() => setOpenChat(null)} />;
  } else if (openListing) {
    screen = (
      <ListingDetailScreen
        item={openListing}
        onBack={closeListing}
        onOpenChat={setOpenChat}
      />
    );
  } else if (editInfoOpen) {
    screen = <EditProfileScreen onBack={() => setEditInfoOpen(false)} />;
  } else if (myAdsOpen) {
    screen = <MyAdsScreen onBack={() => setMyAdsOpen(false)} onOpen={setOpenListing} />;
  } else if (favoritesOpen) {
    screen = (
      <FavoritesScreen
        onBack={() => setFavoritesOpen(false)}
        onOpen={setOpenListing}
      />
    );
  } else if (tab === 'chats') {
    screen = <ChatListScreen onOpen={setOpenChat} />;
  } else if (tab === 'profile') {
    screen = (
      <ProfileScreen
        onOpenFavorites={() => setFavoritesOpen(true)}
        onEditInfo={() => setEditInfoOpen(true)}
        onOpenMyAds={() => setMyAdsOpen(true)}
      />
    );
  } else {
    screen = <HomeScreen onOpen={setOpenListing} />;
  }

  const showTabs = user && !openChat && !openListing && !favoritesOpen && !myAdsOpen && !editInfoOpen;

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
