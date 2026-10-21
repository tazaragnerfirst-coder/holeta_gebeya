import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMyAds, isLiveAd } from '../lib/ads';
import { subscribeChats } from '../lib/chat';
import { getSellerAnalytics, getListingAnalyticsBulk } from '../lib/analytics';
import { DailyBars, RankedBars } from '../components/Charts';
import BoostCard from '../components/BoostCard';
import Icon from '../components/Icon';
import ScreenShell, { ui } from '../components/ScreenShell';
import { colors, font, radius } from '../theme';

// Seller dashboard. Mirrors frontend/src/pages/Dashboard.jsx (the
// per-ad "views detail" drill-down is not ported yet).
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
        <Stat label="Total Views" value={ads ? totalViews : '—'} onPress={onOpenViews} />
        <Stat label="Contact Clicks" value={allTimeContacts ?? '—'} />
        <Stat label="Active Chats" value={chats ? chats.length : '—'} />
        <Stat label="Active Ads" value={ads ? activeAds.length : '—'} onPress={onOpenAds} />
        <Stat label="Expired" value={ads ? expiredCount : '—'} onPress={onOpenExpired} />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.cardHead}>
          <View style={styles.cardHeadTitle}>
            <Icon name="trendingUp" size={16} color={colors.ink} />
            <Text style={ui.sectionTitle}>Daily Views</Text>
          </View>
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <Pressable key={r.key} onPress={() => setRangeKey(r.key)} style={[styles.rangeBtn, r.key === rangeKey && styles.rangeBtnActive]}>
                <Text style={[styles.rangeText, r.key === rangeKey && styles.rangeTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {daily === null ? <ActivityIndicator color={colors.primary} /> : (
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

      <View style={styles.chartCard}>
        <View style={styles.cardHeadTitle}>
          <Icon name="star" size={16} color={colors.ink} />
          <Text style={ui.sectionTitle}>Top Ads by Views</Text>
        </View>
        <RankedBars items={viewItems} emptyText="Post an ad to see its performance here." />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.cardHeadTitle}>
          <Icon name="chat" size={16} color={colors.ink} />
          <Text style={ui.sectionTitle}>Top Ads by Contact Clicks</Text>
        </View>
        <RankedBars items={contactItems} emptyText="Contact clicks from buyers will show up here." />
      </View>

      {ads && ads.length > 0 ? (
        <BoostCard
          title={showCompare ? 'Boosted ads get more views' : 'Get more eyes on your ads'}
          description={showCompare ? undefined : 'Boosted ads are shown as Featured on the home screen.'}
          compare={showCompare ? [
            { label: 'Boosted avg views/day', value: boostedAvg },
            { label: 'Regular avg views/day', value: regularAvg },
          ] : null}
          ctaLabel="Boost an ad"
          onPress={onOpenBoost}
        />
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
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  stat: {
    width: '31%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, padding: 13,
  },
  statValue: { fontFamily: font.familyExtraBold, fontSize: 19, color: colors.ink },
  statLabel: { marginTop: 3, fontFamily: font.familySemiBold, fontSize: 11, color: colors.inkFaint },
  chartCard: { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: 14, marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  cardHeadTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rangeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  rangeBtnActive: { backgroundColor: colors.primaryTint, borderColor: colors.primaryTint },
  rangeText: { fontFamily: font.familySemiBold, fontSize: 11.5, color: colors.inkSoft },
  rangeTextActive: { color: colors.primary, fontFamily: font.familyBold },
});
