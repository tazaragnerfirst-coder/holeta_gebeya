import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds, renewAd, isExpiredAd } from '../lib/ads';
import { formatListingPrice } from '../lib/listings';
import ScreenShell from '../components/ScreenShell';

// Ads whose expiry date has passed. Mirrors frontend/src/pages/ExpiredItems.jsx.
export default function ExpiredScreen({ onBack }) {
  const uid = auth.currentUser?.uid;
  const [ads, setAds] = useState(null);
  const [renewingId, setRenewingId] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeMyAds(uid, setAds, () => setAds([]));
  }, [uid]);

  async function handleRenew(id) {
    setRenewingId(id);
    try {
      await renewAd(id);
    } catch (err) {
      Alert.alert("Couldn't renew this ad", err.message || 'Try again.');
    } finally {
      setRenewingId(null);
    }
  }

  let body;
  if (ads === null) {
    body = <ActivityIndicator size="large" color="#4F7052" style={styles.loader} />;
  } else {
    const expired = ads.filter(isExpiredAd);
    body = expired.length === 0 ? (
      <Text style={styles.muted}>No expired ads yet.</Text>
    ) : (
      expired.map((item) => {
        const photo = item.images?.[0] || item.photo;
        return (
          <View key={item.id} style={styles.row}>
            {photo ? <Image source={{ uri: photo }} style={styles.thumb} /> : <View style={[styles.thumb, styles.noThumb]} />}
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled'}</Text>
              <Text style={styles.price}>{formatListingPrice(item)}</Text>
            </View>
            <Pressable
              onPress={() => handleRenew(item.id)}
              disabled={renewingId === item.id}
              style={[styles.renew, renewingId === item.id && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.renewText}>{renewingId === item.id ? '...' : 'Renew'}</Text>
            </Pressable>
          </View>
        );
      })
    );
  }

  return (
    <ScreenShell title="Expired" onBack={onBack}>
      {body}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  muted: { fontSize: 14, color: '#5F6368', marginTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#F4F5F7' },
  noThumb: { backgroundColor: '#E0E0E0' },
  info: { flex: 1, marginHorizontal: 10 },
  title: { fontSize: 14, fontWeight: '600', color: '#1F1F1F' },
  price: { marginTop: 3, fontSize: 13, fontWeight: '700', color: '#4F7052' },
  renew: {
    borderWidth: 1, borderColor: '#4F7052', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  renewText: { fontSize: 13, fontWeight: '700', color: '#4F7052' },
  disabled: { opacity: 0.5 },
});
