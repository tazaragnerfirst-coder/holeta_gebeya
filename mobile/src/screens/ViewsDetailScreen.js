import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds } from '../lib/ads';
import { getSellerAnalytics } from '../lib/analytics';
import { DailyBars, RankedBars } from '../components/Charts';
import ScreenShell, { ui } from '../components/ScreenShell';

// Views analytics for all of the seller's ads. Mirrors frontend/src/pages/ViewsDetail.jsx.
const RANGES = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

export default function ViewsDetailScreen({ onBack }) {
  const uid = auth.currentUser?.uid;
  const [ads, setAds] = useState(null);
  const [rangeKey, setRangeKey] = useState('30');
  const [daily, setDaily] = useState(null);
  const [error, setError] = useState('');

  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeMyAds(uid, setAds, () => setAds([]));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setDaily(null);
    getSellerAnalytics(uid, range.days)
      .then(setDaily)
      .catch(() => { setDaily([]); setError("Couldn't load this chart."); });
  }, [uid, range.days]);

  const list = ads || [];
  const totalViews = list.reduce((s, a) => s + (a.views || 0), 0);

  const dailySeries = useMemo(
    () => (daily || []).map((d) => ({ date: d.date, value: d.views || 0 })),
    [daily],
  );
  const adItems = useMemo(
    () => list.map((a) => ({ id: a.id, label: a.title || 'Untitled', value: a.views || 0 })),
    [list],
  );
  const categoryItems = useMemo(() => {
    const totals = {};
    list.forEach((a) => {
      const key = a.category || 'Other';
      totals[key] = (totals[key] || 0) + (a.views || 0);
    });
    return Object.entries(totals).map(([label, value]) => ({ id: label, label, value }));
  }, [list]);

  return (
    <ScreenShell title="Views" onBack={onBack}>
      {error ? <Text style={ui.error}>{error}</Text> : null}

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{ads ? totalViews : '—'}</Text>
          <Text style={styles.statLabel}>Total views</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{ads ? list.length : '—'}</Text>
          <Text style={styles.statLabel}>Ads posted</Text>
        </View>
      </View>

      <View style={ui.card}>
        <View style={styles.head}>
          <Text style={ui.sectionTitle}>Daily views</Text>
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <Pressable key={r.key} onPress={() => setRangeKey(r.key)} style={[styles.rangeBtn, r.key === rangeKey && styles.rangeBtnActive]}>
                <Text style={[styles.rangeText, r.key === rangeKey && styles.rangeTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {daily === null ? <ActivityIndicator color="#4F7052" /> : <DailyBars data={dailySeries} />}
      </View>

      <View style={ui.card}>
        <Text style={ui.sectionTitle}>All ads by views</Text>
        <RankedBars items={adItems} limit={10} emptyText="Post an ad to see its performance here." />
      </View>

      <View style={ui.card}>
        <Text style={ui.sectionTitle}>Views by category</Text>
        <RankedBars items={categoryItems} limit={6} emptyText="No category data yet." />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#F4F8F4', borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#4F7052' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#5F6368' },
  head: { marginBottom: 10 },
  rangeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D4D8' },
  rangeBtnActive: { backgroundColor: '#4F7052', borderColor: '#4F7052' },
  rangeText: { fontSize: 12, color: '#1F1F1F' },
  rangeTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
