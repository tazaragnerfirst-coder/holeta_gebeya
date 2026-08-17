import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd, daysSincePosted, isCurrentlyBoosted } from '../lib/adStatus';
import { getSellerAnalytics } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import DailyViewsChart from '../components/DailyViewsChart.jsx';
import ContactFunnelChart from '../components/ContactFunnelChart.jsx';
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

  useEffect(() => {
    if (registeredUid) return;
    requireRegistered().catch((err) => console.error(err));
  }, [registeredUid]);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  useEffect(() => {
    if (!registeredUid) return;
    setAnalyticsReady(false);
    getSellerAnalytics(registeredUid, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => setAnalyticsReady(true));
  }, [registeredUid, range.days]);

  const ready = adsReady;
  const timedOut = useLoadTimeout(ready, 3000);

  const active = ads.filter(isActiveAd);

  // Range-filtered totals from the daily analytics docs. For 7d/30d
  // these are the real numbers. For "All time" the analytics
  // collection only goes back to when this feature shipped, so we
  // show the true historical total from the per-listing `views`
  // counter instead — it's been accumulating since each ad was
  // posted and is strictly more accurate for that one range.
  const rangeViews = useMemo(() => analytics.reduce((s, a) => s + (a.views || 0), 0), [analytics]);
  const rangeContacts = useMemo(() => analytics.reduce((s, a) => s + (a.contacts || 0), 0), [analytics]);
  const allTimeViews = ads.reduce((s, a) => s + (a.views || 0), 0);
  const totalViews = !analyticsReady ? allTimeViews : (rangeKey === 'all' ? allTimeViews : rangeViews);

  const adRankingItems = useMemo(
    () => ads.map((a) => ({ label: a.title, value: a.views || 0 })),
    [ads]
  );
  const categoryItems = useMemo(() => {
    const totals = {};
    ads.forEach((a) => { totals[a.category || 'Other'] = (totals[a.category || 'Other'] || 0) + (a.views || 0); });
    return Object.entries(totals).map(([label, value]) => ({ label, value }));
  }, [ads]);

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
      <div className="dash-head">
        <h2 className="page-title" style={{ margin: 0 }}>Seller Dashboard</h2>
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

      <div className="stat-row">
        <Link to="/dashboard/views" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
          <span className="detail-tag stat-card-tag">Detail</span>
          <div className="val">{totalViews}</div><div className="lbl">Total Views</div>
        </Link>
        <div className="stat-card">
          <div className="val">{analyticsReady ? rangeContacts : '—'}</div><div className="lbl">Contact Clicks</div>
        </div>
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
          <div className="val">{ads.length - active.length}</div><div className="lbl">Expired</div>
        </Link>
      </div>

      <h3 className="section-title"><Icon name="trendingUp" size={16} /> Daily Views</h3>
      <div className="chart-card">
        {analyticsReady
          ? <DailyViewsChart data={analytics.map((a) => ({ date: a.date, views: a.views || 0 }))} />
          : <div className="chart-empty" style={{ height: 140 }}>Loading…</div>}
      </div>

      <h3 className="section-title"><Icon name="chat" size={16} /> Views → Contact</h3>
      <div className="chart-card">
        {analyticsReady
          ? <ContactFunnelChart views={rangeViews} contacts={rangeContacts} />
          : <div className="chart-empty" style={{ height: 80 }}>Loading…</div>}
      </div>
      {analyticsReady && analytics.length === 0 && (
        <p className="helper-text">
          {rangeKey === 'all'
            ? "No contact-click or daily-view history yet — this tracking started with this update, so it builds up from here."
            : 'No analytics recorded yet for this period — data builds up as buyers view and contact you.'}
        </p>
      )}

      <h3 className="section-title"><Icon name="star" size={16} /> Top Ads by Views</h3>
      <div className="chart-card">
        <RankedBarChart items={adRankingItems} limit={5} emptyText="Post an ad to see its performance here." />
      </div>

      <h3 className="section-title"><Icon name="grid" size={16} /> Views by Category</h3>
      <div className="chart-card">
        <RankedBarChart items={categoryItems} limit={6} emptyText="No category data yet." />
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

      <h3 className="section-title">My Ads</h3>
      {!ready && !timedOut && <p className="helper-text">Loading...</p>}
      {!ready && timedOut && (
        <StateMessage
          tone="error"
          icon="history"
          text="Couldn't load your ads. Check your connection."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      )}
      {ready && ads.length === 0 && (
        <StateMessage text="You haven't posted anything yet." actionLabel="Post an ad" actionTo="/post" />
      )}
      {ads.map((a) => {
        const photo = a.images && a.images[0];
        return (
          <Link to={`/product/${a.id}`} className="ad-row" key={a.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
              {!photo && <Icon name="image" size={16} />}
            </div>
            <div className="info">
              <div className="t">{a.title}</div>
              <div className="p">{a.price} ETB</div>
              <div className="metrics"><span><Icon name="eye" size={13} /> {a.views || 0}</span></div>
            </div>
            <div className={`status-pill ${a.status}`}>{a.status}</div>
          </Link>
        );
      })}
    </div>
  );
}
