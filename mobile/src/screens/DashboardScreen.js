import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds, isLiveAd } from '../lib/ads';
import { subscribeChats } from '../lib/chat';
import { getSellerAnalytics, getListingAnalyticsBulk } from '../lib/analytics';
import { DailyBars, RankedBars } from '../components/Charts';
import ScreenShell, { ui } from '../components/ScreenShell';

// Seller dashboard. Mirrors frontend/src/pages/Dashboard.jsx (the
// views/contacts/expired detail pages are not ported yet).
const RANGES = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

function isExpiredAd(ad) {
  if (!ad.expiresAt) return false;
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms < Date.now();
}

function isBoosted(ad) {
  return !!(ad.boostedUntil && ad.boostedUntil.toDate?.() > new Date());
}

function viewsPerDay(ad) {
  const ms = typeof ad.createdAt?.toMillis === 'function' ? ad.createdAt.toMillis() : null;
  if (!ms) return 0;
  const days = Math.max(1, Math.round((Date.now() - ms) / (24 * 60 * 60 * 1000)));
  return (ad.views || 0) / days;
}

function avg(list) {
  if (list.length === 0) return null;
  return Math.round((list.reduce((s, a) => s + viewsPerDay(a), 0) / list.length) * 10) / 10;
}

export default function DashboardScreen({ onBack, onOpenBoost, onOpenViews, onOpenExpired, onOpenAds }) {
  const uid = auth.currentUser?.uid;

  const [ads, setAds] = useState(null);
  const [chats, setChats] = useState(null);
  const [rangeKey, setRangeKey] = useState('30');
  const [daily, setDaily] = useState(null);
  const [allTimeContacts, setAllTimeContacts] = useState(null);
  const [contactsPerAd, setContactsPerAd] = useState({});
  const [error, setError] = useState('');

  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];

  useEffect(() => {
    if (!uid) return undefined;
    const unsubAds = subscribeMyAds(uid, setAds, () => setAds([]));
    const unsubChats = subscribeChats(uid, setChats, () => setChats([]));
    return () => { unsubAds(); unsubChats(); };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setDaily(null);
    getSellerAnalytics(uid, range.days)
      .then((rows) => setDaily(rows))
      .catch(() => { setDaily([]); setError("Couldn't load the daily views chart."); });
  }, [uid, range.days]);

  useEffect(() => {
    if (!uid) return;
    getSellerAnalytics(uid, Infinity)
      .then((rows) => setAllTimeContacts(rows.reduce((s, a) => s + (a.contacts || 0), 0)))
      .catch(() => setAllTimeContacts(null));
  }, [uid]);

  const adIds = (ads || []).map((a) => a.id).join(',');
  useEffect(() => {
    if (!uid || !ads || ads.length === 0) { setContactsPerAd({}); return; }
    getListingAnalyticsBulk(ads.map((a) => a.id), uid, Infinity)
      .then((byListing) => {
        const totals = {};
        Object.entries(byListing).forEach(([id, rows]) => {
          totals[id] = rows.reduce((s, d) => s + (d.contacts || 0), 0);
        });
        setContactsPerAd(totals);
      })
      .catch(() => setContactsPerAd({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, adIds]);

  const list = ads || [];
  const totalViews = list.reduce((s, a) => s + (a.views || 0), 0);
  const activeAds = list.filter(isLiveAd);
  const expiredCount = list.filter(isExpiredAd).length;

  const dailySeries = useMemo(
    () => (daily || []).map((d) => ({ date: d.date, value: d.views || 0 })),
    [daily],
  );
  const viewItems = useMemo(() => list.map((a) => ({ id: a.id, label: a.title || 'Untitled', value: a.views || 0 })), [list]);
  const contactItems = useMemo(
    () => list.map((a) => ({ id: a.id, label: a.title || 'Untitled', value: contactsPerAd[a.id] || 0 })),
    [list, contactsPerAd],
  );

  const boosted = list.filter(isBoosted);
  const regular = list.filter((a) => !isBoosted(a));
  const boostedAvg = avg(boosted);
  const regularAvg = avg(regular);
  const showCompare = boostedAvg != null && regularAvg != null;

  if (!uid) return null;

  return (
    <ScreenShell title="Seller dashboard" onBack={onBack}>
      {error ? <Text style={ui.error}>{error}</Text> : null}

      <View style={styles.statGrid}>
        <Stat label="Total views" value={ads ? totalViews : '—'} onPress={onOpenViews} />
        <Stat label="Contact clicks" value={allTimeContacts ?? '—'} />
        <Stat label="Active chats" value={chats ? chats.length : '—'} />
        <Stat label="Active ads" value={ads ? activeAds.length : '—'} onPress={onOpenAds} />
        <Stat label="Expired" value={ads ? expiredCount : '—'} onPress={onOpenExpired} />
      </View>

      <View style={ui.card}>
        <View style={styles.cardHead}>
          <Text style={ui.sectionTitle}>Daily views</Text>
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <Pressable key={r.key} onPress={() => setRangeKey(r.key)} style={[styles.rangeBtn, r.key === rangeKey && styles.rangeBtnActive]}>
                <Text style={[styles.rangeText, r.key === rangeKey && styles.rangeTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {daily === null ? <ActivityIndicator color="#4F7052" /> : (
          <DailyBars data={dailySeries} />
        )}
        {daily !== null && daily.length === 0 ? (
          <Text style={ui.cardSub}>
            {rangeKey === 'all'
              ? 'No daily-view history yet. Tracking started with this update, so it builds up from here.'
              : 'No views recorded yet for this period.'}
          </Text>
        ) : null}
      </View>

      <View style={ui.card}>
        <Text style={ui.sectionTitle}>Top ads by views</Text>
        <RankedBars items={viewItems} emptyText="Post an ad to see its performance here." />
      </View>

      <View style={ui.card}>
        <Text style={ui.sectionTitle}>Top ads by contact clicks</Text>
        <RankedBars items={contactItems} emptyText="Contact clicks from buyers will show up here." />
      </View>

      {ads && ads.length > 0 ? (
        <View style={styles.boost}>
          <Text style={styles.boostTop}>BOOST</Text>
          <Text style={styles.boostTitle}>
            {showCompare ? 'Boosted ads get more views' : 'Get more eyes on your ads'}
          </Text>
          {showCompare ? (
            <View style={styles.compareRow}>
              <View style={styles.compareItem}>
                <Text style={styles.compareNum}>{boostedAvg}</Text>
                <Text style={styles.compareLabel}>Boosted avg views/day</Text>
              </View>
              <View style={styles.compareItem}>
                <Text style={styles.compareNum}>{regularAvg}</Text>
                <Text style={styles.compareLabel}>Regular avg views/day</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.boostText}>Boosted ads are shown as Featured on the home screen.</Text>
          )}
          <Pressable onPress={onOpenBoost} style={styles.boostBtn} accessibilityRole="button">
            <Text style={styles.boostBtnText}>Boost an ad</Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenShell>
  );
}

function Stat({ label, value, onPress }) {
  const body = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={styles.stat} accessibilityRole="button">{body}</Pressable>;
  }
  return <View style={styles.stat}>{body}</View>;
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: {
    width: '48%', backgroundColor: '#F4F8F4', borderRadius: 14, padding: 14,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#4F7052' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#5F6368' },
  cardHead: { marginBottom: 10 },
  rangeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D4D8' },
  rangeBtnActive: { backgroundColor: '#4F7052', borderColor: '#4F7052' },
  rangeText: { fontSize: 12, color: '#1F1F1F' },
  rangeTextActive: { color: '#FFFFFF', fontWeight: '600' },
  boost: {
    backgroundColor: '#1F3B24', borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 16,
  },
  boostTop: { fontSize: 11, fontWeight: '700', color: '#A7D7AE', letterSpacing: 1 },
  boostTitle: { marginTop: 6, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  boostText: { marginTop: 6, fontSize: 13, color: '#D6E6D8', lineHeight: 19 },
  compareRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  compareItem: { flex: 1 },
  compareNum: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  compareLabel: { marginTop: 2, fontSize: 12, color: '#D6E6D8' },
  boostBtn: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  boostBtnText: { color: '#1F3B24', fontSize: 15, fontWeight: '700' },
});
