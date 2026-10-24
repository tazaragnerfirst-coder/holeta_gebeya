import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from '@firebase/auth';
import { auth } from '../lib/firebase';
import { getMyProfile, isSubscriptionActive } from '../lib/profile';
import { getSellerRating } from '../lib/store';
import { getAppBannerUrl } from '../lib/appBanner';
import { subscribeWalletBalance } from '../lib/wallet';
import { subscribeCoinBalance, formatCoin } from '../lib/coin';
import { subscribeMyAds } from '../lib/ads';
import Icon from '../components/Icon';
import StarRow from '../components/StarRow';
import { colors, font, radius } from '../theme';

// Mirrors frontend/src/pages/Profile.jsx: banner hero with name pill + rating,
// three quick cards, then two grouped menu boxes (same items, same order).
// App-only: the Log out row at the bottom (the bot has no logout).
export default function ProfileScreen({ onNavigate, onOpenSupport }) {
  const uid = auth.currentUser?.uid;
  const [profile, setProfile] = useState(null);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [bannerUrl, setBannerUrl] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [adCount, setAdCount] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;
    getMyProfile(uid).then(setProfile);
    getSellerRating(uid).then(setRating);
    getAppBannerUrl().then(setBannerUrl);
    const unsubs = [
      subscribeWalletBalance(uid, setWalletBalance),
      subscribeCoinBalance(uid, setCoinBalance),
      subscribeMyAds(uid, (ads) => setAdCount(ads.length), () => {}),
    ];
    return () => unsubs.forEach((u) => u && u());
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

  const quickActions = [
    { icon: 'edit', t: 'Edit Info', onPress: () => onNavigate('editInfo') },
    { icon: 'bookmark', t: 'Favorites', onPress: () => onNavigate('favorites') },
    { icon: 'gear', t: 'Settings', onPress: () => onNavigate('settings') },
  ];
  const box1 = [
    { icon: 'wallet', t: 'Wallet', sub: `${walletBalance.toLocaleString('en-US')} ETB`, onPress: () => onNavigate('wallet') },
    { icon: 'listBullets', t: 'My Ads', sub: `${adCount} listing${adCount === 1 ? '' : 's'}`, onPress: () => onNavigate('myAds') },
    { icon: 'store', t: 'My Store', onPress: () => onNavigate('store') },
    { icon: 'coin', t: 'Holeta Coin', sub: `${formatCoin(coinBalance)} Coin`, onPress: () => onNavigate('coin') },
  ];
  const box2 = [
    { icon: 'crown', t: 'Subscription', onPress: () => onNavigate('subscription') },
    { icon: 'trendingUp', t: 'Boost', onPress: () => onNavigate('boost') },
    { icon: 'lock', t: 'Privacy Policy', onPress: () => onNavigate('privacy') },
    { icon: 'helpCircle', t: 'Help & Support', onPress: onOpenSupport },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        {bannerUrl ? (
          <Image source={{ uri: bannerUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['rgba(18,20,17,0)', 'rgba(18,20,17,0.4)']} style={styles.heroShade} pointerEvents="none" />
        <View style={styles.pill}>
          {profile.photo ? (
            <Image source={{ uri: profile.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
              {isSubscriptionActive(profile) ? <Icon name="shieldLock" size={15} weight="fill" color={colors.primary} /> : null}
            </View>
            <View style={styles.stars}>
              <StarRow value={rating.avg} size={14} />
              {rating.count > 0 ? <Text style={styles.ratingCount}>{rating.avg.toFixed(1)} ({rating.count})</Text> : null}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.px}>
        <View style={styles.quickRow}>
          {quickActions.map((q) => (
            <Pressable key={q.t} style={styles.quickCard} onPress={q.onPress} accessibilityRole="button">
              <View style={styles.qi}>
                <Icon name={q.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.quickText}>{q.t}</Text>
            </Pressable>
          ))}
        </View>

        <MenuBox items={box1} />
        <MenuBox items={box2} />
        <MenuBox items={[{ icon: 'logOut', t: 'Log out', onPress: confirmLogout, danger: true }]} />
      </View>
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
          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, m.danger && styles.danger]}>{m.t}</Text>
            {m.sub ? <Text style={styles.menuSub}>{m.sub}</Text> : null}
          </View>
          {!m.danger ? <Icon name="chevronRight" size={16} color={colors.inkFaint} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  content: { paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgApp },
  px: { paddingHorizontal: 16 },
  // Web .profile-hero-card / .profile-pill
  heroCard: { marginTop: 48, marginHorizontal: 16, height: 225, borderRadius: 26, overflow: 'hidden' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  pill: {
    position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: colors.surface, borderRadius: 999,
    paddingVertical: 9, paddingLeft: 9, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 13,
    shadowColor: '#141612', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 4,
  },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.primaryTint },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontFamily: font.familyExtraBold, fontSize: 20 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontFamily: font.familyExtraBold, fontSize: 16, color: colors.ink },
  stars: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingCount: { marginLeft: 5, fontFamily: font.familySemiBold, fontSize: 11, color: colors.inkFaint },
  // Web .quick-row / .quick-card
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickCard: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 7,
  },
  qi: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontFamily: font.familyBold, fontSize: 11.5, color: colors.ink },
  // Web .menu-list / .menu-item / .menu-icon
  menuList: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, overflow: 'hidden', marginTop: 14,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: colors.safetyTint },
  menuTextWrap: { flex: 1 },
  menuText: { fontFamily: font.familySemiBold, fontSize: 13.5, color: colors.ink },
  menuSub: { marginTop: 1, fontFamily: font.familyMedium, fontSize: 11, color: colors.inkFaint },
  danger: { color: colors.safety },
});
