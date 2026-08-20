import React, { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { getListingAnalyticsBulk, getSellerAnalytics } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import DailyRateChart from '../components/DailyRateChart.jsx';
import RankedBarChart from '../components/RankedBarChart.jsx';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

// Opened from the "Contact Clicks" card on the Dashboard. Mirrors
// ViewsDetail's structure but contacts-focused: an all-time contacts
// total, a daily conversion-rate trend with its own range picker,
// and an all-ads-by-contact-clicks ranking. The per-ad "By Ad" list
// itself now lives on the Active Ads (management) page instead.
export default function ContactsDetail() {
  const { ads, adsReady, registeredUid } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);

  // One bulk fetch (all-time) per ad — gives the accurate all-time
  // contacts total used both for the stat card and to rank ads below.
  const [perAd, setPerAd] = useState({});
  const [perAdReady, setPerAdReady] = useState(false);

  const [rangeKey, setRangeKey] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsReady, setAnalyticsReady] = useState(false);

  useEffect(() => {
    if (!adsReady || ads.length === 0) { setPerAdReady(true); return; }
    setPerAdReady(false);
    getListingAnalyticsBulk(ads.map((a) => a.id), Infinity)
      .then((data) => { setPerAd(data); setPerAdReady(true); })
      .catch(() => setPerAdReady(true));
  }, [adsReady, ads]);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  useEffect(() => {
    if (!registeredUid) return;
    setAnalyticsReady(false);
    getSellerAnalytics(registeredUid, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => setAnalyticsReady(true));
  }, [registeredUid, range.days]);

  const rangeViews = useMemo(() => analytics.reduce((s, a) => s + (a.views || 0), 0), [analytics]);
  const rangeContacts = useMemo(() => analytics.reduce((s, a) => s + (a.contacts || 0), 0), [analytics]);

  const totalContacts = useMemo(
    () => Object.values(perAd).reduce((s, days) => s + days.reduce((s2, d) => s2 + (d.contacts || 0), 0), 0),
    [perAd]
  );
  const totalViewsAllAds = ads.reduce((s, a) => s + (a.views || 0), 0);
  const conversionRate = totalViewsAllAds > 0 ? Math.round((totalContacts / totalViewsAllAds) * 100) : null;

  const contactRankingItems = useMemo(() => {
    const contactsFor = (id) => (perAd[id] || []).reduce((s, d) => s + (d.contacts || 0), 0);
    return ads.map((a) => ({ id: a.id, label: a.title, value: contactsFor(a.id) }));
  }, [ads, perAd]);

  return (
    <div className="page">
      <h2 className="page-title">Contact Clicks</h2>
      <div className="stat-row">
        <div className="stat-card"><div className="val">{perAdReady ? totalContacts : '—'}</div><div className="lbl">Total Contact Clicks</div></div>
        <div className="stat-card"><div className="val">{conversionRate != null ? `${conversionRate}%` : '—'}</div><div className="lbl">Views → Contact Rate</div></div>
      </div>

      <div className="chart-card" style={{ marginTop: 6 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="chat" size={16} /> Daily Contact Rate</h3>
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
          ? <DailyRateChart data={analytics} />
          : <div className="chart-empty" style={{ height: 140 }}>Loading…</div>}
        {analyticsReady && analytics.length === 0 && (
          <p className="helper-text" style={{ marginTop: 8 }}>
            {rangeKey === 'all'
              ? "No contact-click history yet — this tracking started with this update, so it builds up from here."
              : 'No contact clicks recorded yet for this period.'}
          </p>
        )}
      </div>

      <div className="chart-card" style={{ marginTop: 14 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="star" size={16} /> All Ads by Contact Clicks</h3>
        </div>
        <RankedBarChart
          items={contactRankingItems}
          limit={5}
          expandable
          scrollCap={7}
          linkTo={(item) => `/dashboard/views/${item.id}`}
          emptyText="Contact clicks from buyers will show up here."
        />
      </div>

      {!adsReady && !timedOut && <p className="helper-text" style={{ marginTop: 8 }}>Loading...</p>}
      {!adsReady && timedOut && (
        <p className="helper-text error-text" style={{ marginTop: 8 }}>
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
    </div>
  );
}
