import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../lib/appData';
import { getListingAnalytics } from '../lib/analytics';
import { isActiveAd } from '../lib/adStatus';
import Icon from '../components/Icon.jsx';
import DailyViewsChart from '../components/DailyViewsChart.jsx';
import ContactFunnelChart from '../components/ContactFunnelChart.jsx';
import RankedBarChart from '../components/RankedBarChart.jsx';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

function daysSince(ts) {
  const ms = typeof ts?.toMillis === 'function' ? ts.toMillis() : null;
  if (!ms) return null;
  return Math.max(1, Math.round((Date.now() - ms) / (24 * 60 * 60 * 1000)));
}

export default function ViewAdDetail() {
  const { id } = useParams();
  const { ads, adsReady } = useAppData();
  const ad = ads.find((a) => a.id === id);

  const [rangeKey, setRangeKey] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsReady, setAnalyticsReady] = useState(false);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  useEffect(() => {
    if (!id) return;
    setAnalyticsReady(false);
    getListingAnalytics(id, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => setAnalyticsReady(true));
  }, [id, range.days]);

  const rangeViews = useMemo(() => analytics.reduce((s, a) => s + (a.views || 0), 0), [analytics]);
  const rangeContacts = useMemo(() => analytics.reduce((s, a) => s + (a.contacts || 0), 0), [analytics]);

  // "vs your other ads" comparisons — scoped to this seller's own
  // listings, not the whole marketplace (that data isn't available
  // here), so the copy below says so explicitly.
  const categoryPeers = ads.filter((a) => a.id !== id && a.category === ad?.category);
  const categoryAvg = categoryPeers.length > 0
    ? Math.round(categoryPeers.reduce((s, a) => s + (a.views || 0), 0) / categoryPeers.length)
    : null;

  const isBoosted = !!(ad?.boostedUntil && ad.boostedUntil.toDate?.() > new Date());
  const thisRate = ad ? (ad.views || 0) / (daysSince(ad.createdAt) || 1) : 0;
  const boostedPeers = ads.filter((a) => a.id !== id && !!(a.boostedUntil && a.boostedUntil.toDate?.() > new Date()));
  const regularPeers = ads.filter((a) => a.id !== id && !(a.boostedUntil && a.boostedUntil.toDate?.() > new Date()));
  const otherGroup = isBoosted ? regularPeers : boostedPeers;
  const otherGroupAvgRate = otherGroup.length > 0
    ? otherGroup.reduce((s, a) => s + (a.views || 0) / (daysSince(a.createdAt) || 1), 0) / otherGroup.length
    : null;
  const showBoostCompare = otherGroupAvgRate != null;

  const conversionRate = rangeViews > 0 ? Math.round((rangeContacts / rangeViews) * 100) : null;
  let tip = null;
  if (analyticsReady && rangeViews >= 10 && conversionRate != null && conversionRate < 5) {
    tip = "Views are coming in but few people are reaching out — try a lower price, sharper photos, or a clearer description.";
  } else if (analyticsReady && rangeViews < 5 && ad && daysSince(ad.createdAt) > 3) {
    tip = 'Not many views yet — boosting this ad or posting in a more specific category can help it get seen.';
  }

  if (!adsReady && !ad) {
    return <div className="page"><p className="helper-text">Loading...</p></div>;
  }
  if (adsReady && !ad) {
    return (
      <div className="page">
        <p className="helper-text">Ad not found.</p>
        <Link to="/dashboard/views">Back to Views</Link>
      </div>
    );
  }

  const photo = ad.images && ad.images[0];

  return (
    <div className="page">
      <h2 className="page-title">Ad performance</h2>

      <div className="view-ad-detail-head">
        <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          {!photo && <Icon name="image" size={16} />}
        </div>
        <div className="info">
          <div className="t">{ad.title}</div>
          <div className="p">{ad.price} ETB</div>
        </div>
        <div className={`status-pill ${ad.status}`}>{isActiveAd(ad) ? 'active' : ad.status}</div>
      </div>

      <div className="dash-head" style={{ marginTop: 16 }}>
        <h3 className="section-title" style={{ margin: 0 }}>Trend</h3>
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

      {categoryAvg != null && (
        <>
          <h3 className="section-title"><Icon name="grid" size={16} /> Vs. your other {ad.category} ads</h3>
          <div className="chart-card">
            <RankedBarChart
              items={[
                { label: 'This ad', value: ad.views || 0 },
                { label: 'Your avg', value: categoryAvg },
              ]}
              limit={2}
            />
          </div>
        </>
      )}

      {showBoostCompare && (
        <>
          <h3 className="section-title"><Icon name="trendingUp" size={16} /> Boosted vs. regular</h3>
          <div className="chart-card">
            <RankedBarChart
              items={[
                { label: isBoosted ? 'This ad (boosted)' : 'This ad', value: Math.round(thisRate * 10) / 10 },
                { label: isBoosted ? 'Your regular ads' : 'Your boosted ads', value: Math.round(otherGroupAvgRate * 10) / 10 },
              ]}
              limit={2}
            />
          </div>
          <p className="helper-text">Average views per day — based on your own ads.</p>
        </>
      )}

      {tip && (
        <div className="chart-card" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="star" size={16} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{tip}</span>
        </div>
      )}
    </div>
  );
}
