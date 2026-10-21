import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds, setAdStatus, deleteAd, isLiveAd } from '../lib/ads';
import { formatListingPrice } from '../lib/listings';
import ScreenShell from '../components/ScreenShell';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

// The seller's own listings: pause/resume and delete. Editing an ad comes in a later step.
export default function MyAdsScreen({ onBack, onOpen }) {
  const uid = auth.currentUser?.uid;
  const [ads, setAds] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeMyAds(uid, setAds, () => setAds([]));
  }, [uid]);

  async function togglePause(ad) {
    setBusyId(ad.id);
    try {
      await setAdStatus(ad.id, ad.status === 'paused' ? 'active' : 'paused');
    } catch (err) {
      Alert.alert("Couldn't update this ad", err.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(ad) {
    Alert.alert('Delete this ad?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(ad.id);
          try {
            await deleteAd(ad.id);
          } catch (err) {
            Alert.alert("Couldn't delete this ad", err.message || 'Try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (
    <ScreenShell title="My ads" onBack={onBack} scroll={false}>
      {ads === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : ads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>You haven't posted any ads yet.</Text>
        </View>
      ) : (
        <FlatList
          data={ads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const photo = item.images?.[0];
            const live = isLiveAd(item);
            const paused = item.status === 'paused';
            const statusLabel = paused ? 'paused' : live ? 'active' : item.status || 'expired';
            const busy = busyId === item.id;
            return (
              <View style={styles.card}>
                <Pressable style={styles.top} onPress={() => onOpen(item)} accessibilityRole="button">
                  {photo ? <Image source={{ uri: photo }} style={styles.thumb} /> : <View style={[styles.thumb, styles.noPhoto]} />}
                  <View style={styles.info}>
                    <Text style={styles.price}>{formatListingPrice(item)}</Text>
                    <Text style={styles.name} numberOfLines={2}>{item.title || 'Untitled'}</Text>
                    <View style={styles.metaRow}>
                      <Icon name="eye" size={13} color={colors.inkFaint} />
                      <Text style={styles.meta}>{item.views || 0}</Text>
                      <View style={[styles.pill, live && !paused ? styles.pillActive : styles.pillMuted]}>
                        <Text style={[styles.pillText, live && !paused ? styles.pillActiveText : styles.pillMutedText]}>{statusLabel}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  {item.status !== 'expired' ? (
                    <Pressable onPress={() => togglePause(item)} disabled={busy} style={[styles.actionBtn, busy && styles.disabled]} accessibilityRole="button">
                      <Icon name={paused ? 'play' : 'pause'} size={14} color={colors.ink} />
                      <Text style={styles.actionText}>{paused ? 'Resume' : 'Pause'}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => confirmDelete(item)} disabled={busy} style={[styles.actionBtn, busy && styles.disabled]} accessibilityRole="button">
                    <Icon name="x" size={14} color={colors.safety} />
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { fontFamily: font.family, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  // Web .ad-manage-card: tappable card with plain border.
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, padding: 10, marginBottom: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  noPhoto: { backgroundColor: colors.line },
  info: { flex: 1, marginLeft: 12 },
  price: { fontFamily: font.familyExtraBold, fontSize: 14.5, color: colors.primary },
  name: { marginTop: 2, fontFamily: font.familyMedium, fontSize: 13, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  meta: { fontFamily: font.family, fontSize: 12, color: colors.inkFaint, marginRight: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  pillActive: { backgroundColor: colors.okTint },
  pillMuted: { backgroundColor: colors.mutedTint },
  pillText: { fontFamily: font.familyBold, fontSize: 10.5 },
  pillActiveText: { color: colors.ok },
  pillMutedText: { color: colors.muted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bgApp,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingVertical: 7, paddingHorizontal: 12,
  },
  actionText: { fontFamily: font.familySemiBold, fontSize: 13, color: colors.ink },
  dangerText: { fontFamily: font.familySemiBold, fontSize: 13, color: colors.safety },
  disabled: { opacity: 0.5 },
});
