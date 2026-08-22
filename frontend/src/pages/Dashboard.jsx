import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd, isExpired, daysSincePosted, isCurrentlyBoosted } from '../lib/adStatus';
import { getSellerAnalytics, getListingAnalyticsBulk } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import DailyViewsChart from '../components/DailyViewsChart.jsx';
import RankedBarChart from '../components/RankedBarChart.jsx';
import BoostCard from '../components/BoostCard.jsx';
import StateMessage from '../components/StateMessage.jsx';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

export default function Dashboard() {
  const { ads, adsReady, chats, chatsReady, registeredUid } = useAppData();
  const requireRegistered = useRequireRegistered();

  const [rangeKey, setRangeKey] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  // Contact Clicks is always the true total (like Total Views), not
  // scoped to the Daily Views chart's own range picker — so it's
  // fetched once, separately, with days=Infinity.
  const [allTimeContacts, setAllTimeContacts] = useState(0);
  const [allTimeReady, setAllTimeReady] = useState(false);
  const [allTimeError, setAllTimeError] = useState(false);

  useEffect(() => {
    if (registeredUid) return;
    requireRegistered().catch((err) => console.error(err));
  }, [registeredUid]);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  function loadDailyAnalytics() {
    if (!registeredUid) return;
    setAnalyticsReady(false);
    setAnalyticsError(false);
    getSellerAnalytics(registeredUid, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => { setAnalyticsReady(true); setAnalyticsError(true); });
  }
  useEffect(loadDailyAnalytics, [registeredUid, range.days]);

  function loadAllTimeContacts() {
    if (!registeredUid) return;
    setAllTimeReady(false);
    setAllTimeError(false);
    getSellerAnalytics(registeredUid, Infinity)
      .then((data) => { setAllTimeContacts(data.reduce((s, a) => s + (a.contacts || 0), 0)); setAllTimeReady(true); })
      .catch(() => { setAllTimeReady(true); setAllTimeError(true); });
  }
  useEffect(loadAllTimeContacts, [registeredUid]);

  // Per-ad contact-click totals, for the Top Ads by Contact Clicks
  // card below — mirrors how adRankingItems is derived from `views`.
  const [contactsPerAd, setContactsPerAd] = useState({});
  const [contactsPerAdError, setContactsPerAdError] = useState(false);
  const [contactsPerAdErrMsg, setContactsPerAdErrMsg] = useState('');
  function loadContactsPerAd() {
    if (!adsReady || ads.length === 0) return;
    setContactsPerAdError(false);
    getListingAnalyticsBulk(ads.map((a) => a.id), registeredUid, Infinity)
      .then((data) => {
        const totals = {};
        Object.entries(data).forEach(([id, days]) => {
          totals[id] = days.reduce((s, d) => s + (d.contacts || 0), 0);
        });
        setContactsPerAd(totals);
      })
      .catch((err) => {
        console.error('getListingAnalyticsBulk failed:', err);
        setContactsPerAdError(true);
        setContactsPerAdErrMsg(err?.code || err?.message || '');
      });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadContactsPerAd, [adsReady, ads.map((a) => a.id).join(',')]);

  const ready = adsReady;
  const timedOut = useLoadTimeout(ready, 3000);

  const active = ads.filter(isActiveAd);

  // Total Views is always the true accumulated total — the
  // per-listing `views` counter has been running since each ad was
  // posted, unlike the daily analytics docs which only go back to
  // when this chart shipped. The range picker below only scopes the
  // Daily Views chart, never this number.
  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);

  const adRankingItems = useMemo(
    () => ads.map((a) => ({ id: a.id, label: a.title, value: a.views || 0 })),
    [ads]
  );
  const contactRankingItems = useMemo(
    () => ads.map((a) => ({ id: a.id, label: a.title, value: contactsPerAd[a.id] || 0 })),
    [ads, contactsPerAd]
  );

  const boostedAds = ads.filter(isCurrentlyBoosted);
  const regularAds = ads.filter((a) => !isCurrentlyBoosted(a));
  const avgRate = (list) => list.length > 0
    ? Math.round((list.reduce((s, a) => s + (a.views || 0) / (daysSincePosted(a) || 1), 0) / list.length) * 10) / 10
    : null;
  const boostedAvg = avgRate(boostedAds);
  const regularAvg = avgRate(regularAds);
  const showBoostCompare = boostedAvg != null && regularAvg != null;

  return (
    <div className="page">
      <h2 className="page-title">Seller Dashboard</h2>

      <div className="stat-row">
        <Link to="/dashboard/views" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
          <span className="detail-tag stat-card-tag">Detail</span>
          <div className="val">{totalViews}</div><div className="lbl">Total Views</div>
        </Link>
        <Link to="/dashboard/contacts" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
          <span className="detail-tag stat-card-tag">Detail</span>
          <div className="val">{allTimeError ? '!' : (allTimeReady ? allTimeContacts : '—')}</div><div className="lbl">Contact Clicks</div>
        </Link>
        <div className="stat-card">
          <div className="val">{chatsReady ? chats.length : '—'}</div><div className="lbl">Active Chats</div>
        </div>
      </div>
      <div className="stat-row">
        <Link to="/dashboard/ads" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
          <span className="detail-tag stat-card-tag">Detail</span>
          <div className="val">{active.length}</div><div className="lbl">Active Ads</div>
        </Link>
        <Link to="/dashboard/expired" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
          <span className="detail-tag stat-card-tag">Detail</span>
          <div className="val">{ads.filter(isExpired).length}</div><div className="lbl">Expired</div>
        </Link>
      </div>

      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="trendingUp" size={16} /> Daily Views</h3>
          <div className="range-picker">
            <button type="button" className="range-btn" onClick={() => setRangeOpen((v) => !v)}>
              {range.label} <Icon name="chevronDown" size={14} />
            </button>
            {rangeOpen && (
              <div className="range-menu">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    type="button"
                    key={r.key}
                    className={`range-option ${r.key === rangeKey ? 'active' : ''}`}
                    onClick={() => { setRangeKey(r.key); setRangeOpen(false); }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {analyticsReady
          ? <DailyViewsChart data={analytics.map((a) => ({ date: a.date, views: a.views || 0 }))} />
          : <div className="chart-empty" style={{ height: 140 }}>Loading…</div>}
        {analyticsReady && analyticsError && (
          <StateMessage tone="error" icon="alertTriangle" text="Couldn't load this chart." actionLabel="Retry" onAction={loadDailyAnalytics} />
        )}
        {analyticsReady && !analyticsError && analytics.length === 0 && (
          <p className="helper-text" style={{ marginTop: 8 }}>
            {rangeKey === 'all'
              ? "No daily-view history yet — this tracking started with this update, so it builds up from here."
              : 'No views recorded yet for this period.'}
          </p>
        )}
      </div>

      <div className="chart-card" style={{ marginTop: 14 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="star" size={16} /> Top Ads by Views</h3>
        </div>
        <RankedBarChart items={adRankingItems} limit={5} emptyText="Post an ad to see its performance here." />
      </div>

      <div className="chart-card" style={{ marginTop: 14 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="chat" size={16} /> Top Ads by Contact Clicks</h3>
        </div>
        {contactsPerAdError
          ? <StateMessage tone="error" icon="alertTriangle" text={`Couldn't load contact clicks.${contactsPerAdErrMsg ? ` (${contactsPerAdErrMsg})` : ''}`} actionLabel="Retry" onAction={loadContactsPerAd} />
          : <RankedBarChart items={contactRankingItems} limit={5} emptyText="Contact clicks from buyers will show up here." />}
      </div>

      {ready && ads.length > 0 && (
        <BoostCard
          title={showBoostCompare ? 'Boosted ads get more views' : 'Get more eyes on your ads'}
          description={showBoostCompare ? undefined : 'Boosted ads are shown as Featured on the home screen.'}
          compare={showBoostCompare ? [
            { label: 'Boosted avg views/day', value: boostedAvg },
            { label: 'Regular avg views/day', value: regularAvg },
          ] : null}
          ctaLabel="Boost an ad"
        />
      )}

      {!ready && !timedOut && <p className="helper-text" style={{ marginTop: 8 }}>Loading...</p>}
      {!ready && timedOut && (
        <p className="helper-text error-text" style={{ marginTop: 8 }}>
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
    </div>
  );
}
