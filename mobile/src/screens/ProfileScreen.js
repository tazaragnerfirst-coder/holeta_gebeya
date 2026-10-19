import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signOut } from '@firebase/auth';
import { auth } from '../lib/firebase';
import { getMyProfile } from '../lib/profile';

// Signed-in user's profile: name, photo, location, and entry points to saved listings and logout.
export default function ProfileScreen({ onNavigate, onOpenSupport }) {
  const uid = auth.currentUser?.uid;
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getMyProfile(uid).then(setProfile);
  }, [uid]);

  function confirmLogout() {
    Alert.alert('Log out?', 'You will need to log in with Telegram again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut(auth).catch(() => {}) },
    ]);
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F7052" />
      </View>
    );
  }

  const initial = profile.name ? profile.name.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.hero}>
        {profile.photo ? (
          <Image source={{ uri: profile.photo }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name}</Text>
        {profile.location ? <Text style={styles.muted}>📍 {profile.location}</Text> : null}
      </View>

      <ScrollView style={styles.menu}>
        <MenuItem label="Edit info" onPress={() => onNavigate('editInfo')} />
        <MenuItem label="Dashboard" onPress={() => onNavigate('dashboard')} />
        <MenuItem label="My ads" onPress={() => onNavigate('myAds')} />
        <MenuItem label="My store" onPress={() => onNavigate('store')} />
        <MenuItem label="Saved listings" onPress={() => onNavigate('favorites')} />
        <MenuItem label="Wallet" onPress={() => onNavigate('wallet')} />
        <MenuItem label="Holeta Coin" onPress={() => onNavigate('coin')} />
        <MenuItem label="Subscription" onPress={() => onNavigate('subscription')} />
        <MenuItem label="Boost" onPress={() => onNavigate('boost')} />
        <MenuItem label="Help & Support" onPress={onOpenSupport} />
        <MenuItem label="Settings" onPress={() => onNavigate('settings')} />
        <MenuItem label="Privacy policy" onPress={() => onNavigate('privacy')} />
        <MenuItem label="Log out" onPress={confirmLogout} danger />
      </ScrollView>
    </View>
  );
}

function MenuItem({ label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.menuItem}>
      <Text style={[styles.menuText, danger && styles.danger]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#4F7052',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F4F5F7',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  muted: {
    marginTop: 4,
    fontSize: 14,
    color: '#5F6368',
  },
  menu: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  menuText: {
    fontSize: 16,
    color: '#1F1F1F',
  },
  danger: {
    color: '#B3261E',
  },
  chevron: {
    fontSize: 20,
    color: '#9AA0A6',
  },
});
