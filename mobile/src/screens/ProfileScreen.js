import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signOut } from '@firebase/auth';
import { auth } from '../lib/firebase';
import { getMyProfile } from '../lib/profile';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

// Signed-in user's profile: name, photo, location, and entry points to saved listings and logout.
// Layout mirrors frontend/src/pages/Profile.jsx (.profile-head + grouped .menu-list boxes).
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initial = profile.name ? profile.name.charAt(0).toUpperCase() : '?';

  const account = [
    { icon: 'edit', t: 'Edit info', onPress: () => onNavigate('editInfo') },
    { icon: 'chartBar', t: 'Dashboard', onPress: () => onNavigate('dashboard') },
    { icon: 'bookmark', t: 'Saved listings', onPress: () => onNavigate('favorites') },
    { icon: 'gear', t: 'Settings', onPress: () => onNavigate('settings') },
  ];
  const box1 = [
    { icon: 'wallet', t: 'Wallet', onPress: () => onNavigate('wallet') },
    { icon: 'listBullets', t: 'My ads', onPress: () => onNavigate('myAds') },
    { icon: 'store', t: 'My store', onPress: () => onNavigate('store') },
    { icon: 'coin', t: 'Holeta Coin', onPress: () => onNavigate('coin') },
  ];
  const box2 = [
    { icon: 'crown', t: 'Subscription', onPress: () => onNavigate('subscription') },
    { icon: 'trendingUp', t: 'Boost', onPress: () => onNavigate('boost') },
    { icon: 'lock', t: 'Privacy policy', onPress: () => onNavigate('privacy') },
    { icon: 'helpCircle', t: 'Help & Support', onPress: onOpenSupport },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {profile.photo ? (
          <Image source={{ uri: profile.photo }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name}</Text>
        {profile.location ? (
          <View style={styles.locRow}>
            <Icon name="mapPin" size={13} color={colors.inkFaint} />
            <Text style={styles.muted}>{profile.location}</Text>
          </View>
        ) : null}
      </View>

      <MenuBox items={account} />
      <MenuBox items={box1} />
      <MenuBox items={box2} />
      <MenuBox items={[{ icon: 'logOut', t: 'Log out', onPress: confirmLogout, danger: true }]} />
    </ScrollView>
  );
}

function MenuBox({ items }) {
  return (
    <View style={styles.menuList}>
      {items.map((m, i) => (
        <Pressable
          key={m.t}
          onPress={m.onPress}
          accessibilityRole="button"
          style={[styles.menuItem, i === items.length - 1 && styles.menuItemLast]}
        >
          <View style={[styles.menuIcon, m.danger && styles.menuIconDanger]}>
            <Icon name={m.icon} size={17} color={m.danger ? colors.safety : colors.inkSoft} />
          </View>
          <Text style={[styles.menuText, m.danger && styles.danger]}>{m.t}</Text>
          {!m.danger ? <Icon name="chevronRight" size={16} color={colors.inkFaint} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgApp },
  hero: { alignItems: 'center', paddingTop: 64, paddingBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface },
  avatarText: { color: colors.primary, fontFamily: font.familyExtraBold, fontSize: 26 },
  name: { marginTop: 12, fontFamily: font.familyExtraBold, fontSize: 17, color: colors.ink },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  muted: { fontFamily: font.family, fontSize: 12, color: colors.inkFaint },
  // Web .menu-list / .menu-item / .menu-icon
  menuList: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, overflow: 'hidden', marginTop: 12,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: colors.safetyTint },
  menuText: { flex: 1, fontFamily: font.familySemiBold, fontSize: 13.5, color: colors.ink },
  danger: { color: colors.safety },
});
