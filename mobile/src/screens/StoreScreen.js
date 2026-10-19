import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';
import { auth } from '../lib/firebase';
import { getMyProfile, isSubscriptionActive } from '../lib/profile';
import { getSellerRating, getStoreProfile } from '../lib/store';
import { isLiveAd, subscribeMyAds } from '../lib/ads';
import { formatListingPrice } from '../lib/listings';

function socialHref(key, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (key === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }
  if (key === 'tiktok') return `https://tiktok.com/@${value.replace(/^@/, '')}`;
  if (key === 'instagram') return `https://instagram.com/${value.replace(/^@/, '')}`;
  return `https://${value}`;
}

const SOCIAL = [['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['website', 'Website']];

// Your own storefront as buyers see it: name, rating, bio, links and active listings.
export default function StoreScreen({ onBack, onOpen }) {
  const uid = auth.currentUser?.uid;
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [ads, setAds] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    getMyProfile(uid).then(setProfile);
    getStoreProfile(uid).then(setStore).catch(() => setStore(null));
    getSellerRating(uid).then(setRating);
    return subscribeMyAds(uid, setAds, () => setAds([]));
  }, [uid]);

  const live = (ads || []).filter(isLiveAd);

  return (
    <ScreenShell title="My store" onBack={onBack}>
      <View style={ui.card}>
        <Text style={[ui.cardValue, { fontSize: 22 }]}>
          {profile?.name || '···'}{isSubscriptionActive(profile) ? '  ✔ Premium' : ''}
        </Text>
        {rating.count > 0 ? <Text style={ui.cardSub}>★ {rating.avg.toFixed(1)} ({rating.count})</Text> : <Text style={ui.cardSub}>No reviews yet</Text>}
        {store?.address ? <Text style={ui.cardSub}>📍 {store.address}</Text> : null}
        {store?.bio ? <Text style={[ui.muted, { marginTop: 8 }]}>{store.bio}</Text> : null}
      </View>

      {store?.socialLinks ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {SOCIAL.filter(([k]) => store.socialLinks[k]).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => Linking.openURL(socialHref(k, store.socialLinks[k])).catch(() => {})}
              style={[ui.secondary, { paddingHorizontal: 14, paddingVertical: 8 }]}
              accessibilityRole="link"
            >
              <Text style={ui.secondaryText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={ui.sectionTitle}>Listings ({live.length})</Text>
      {ads === null ? <Text style={ui.muted}>Loading…</Text> : live.length === 0 ? (
        <Text style={ui.muted}>No active listings right now.</Text>
      ) : live.map((item) => (
        <Pressable key={item.id} style={[ui.txRow, { justifyContent: 'flex-start' }]} onPress={() => onOpen(item)} accessibilityRole="button">
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#F4F5F7' }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#E0E0E0' }} />
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ui.txLabel} numberOfLines={2}>{item.title || 'Untitled'}</Text>
            <Text style={[ui.txDate, { color: '#4F7052', fontWeight: '700' }]}>{formatListingPrice(item)}</Text>
          </View>
        </Pressable>
      ))}
    </ScreenShell>
  );
}
