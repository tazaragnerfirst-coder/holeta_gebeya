import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds, renewAd, isExpiredAd } from '../lib/ads';
import { formatListingPrice } from '../lib/listings';
import ScreenShell from '../components/ScreenShell';
import { colors, font, radius } from '../theme';

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
    body = <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />;
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
  muted: { fontFamily: font.family, fontSize: 14, color: colors.inkSoft, marginTop: 8 },
  // Web .ad-row: no card, 11px vertical padding, bottom hairline.
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  thumb: { width: 54, height: 54, borderRadius: 11, backgroundColor: colors.surfaceSunken },
  noThumb: { backgroundColor: colors.surfaceSunken },
  info: { flex: 1, marginHorizontal: 11 },
  title: { fontFamily: font.familyBold, fontSize: 13, color: colors.ink },
  price: { marginTop: 3, fontFamily: font.familyExtraBold, fontSize: 13, color: colors.ink },
  renew: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  renewText: { fontFamily: font.familyBold, fontSize: 13, color: colors.primary },
  disabled: { opacity: 0.5 },
});
