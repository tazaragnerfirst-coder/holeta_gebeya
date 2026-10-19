import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds, setAdStatus, deleteAd, isLiveAd } from '../lib/ads';
import { formatListingPrice } from '../lib/listings';

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
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>My ads</Text>
      </View>

      {ads === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F7052" />
        </View>
      ) : ads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>You haven't posted any ads yet.</Text>
        </View>
      ) : (
        <FlatList
          data={ads}
          keyExtractor={(item) => item.id}
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
                    <Text style={styles.name} numberOfLines={2}>{item.title || 'Untitled'}</Text>
                    <Text style={styles.price}>{formatListingPrice(item)}</Text>
                    <Text style={styles.meta}>👁 {item.views || 0} · {statusLabel}</Text>
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  {item.status !== 'expired' ? (
                    <Pressable onPress={() => togglePause(item)} disabled={busy} style={[styles.actionBtn, busy && styles.disabled]} accessibilityRole="button">
                      <Text style={styles.actionText}>{paused ? 'Resume' : 'Pause'}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => confirmDelete(item)} disabled={busy} style={[styles.actionBtn, busy && styles.disabled]} accessibilityRole="button">
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { fontSize: 14, color: '#5F6368', textAlign: 'center' },
  topBar: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#4F7052' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  card: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  top: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F4F5F7' },
  noPhoto: { backgroundColor: '#E0E0E0' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 14, fontWeight: '600', color: '#1F1F1F' },
  price: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#4F7052' },
  meta: { marginTop: 4, fontSize: 12, color: '#5F6368' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  actionBtn: {
    borderWidth: 1, borderColor: '#D0D4D8', borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: '#1F1F1F' },
  dangerText: { fontSize: 14, fontWeight: '600', color: '#B3261E' },
  disabled: { opacity: 0.5 },
});
