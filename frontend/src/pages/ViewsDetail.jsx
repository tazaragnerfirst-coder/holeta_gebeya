import React, { useEffect, useMemo, useState } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { getSellerAnalytics } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import DailyViewsChart from '../components/DailyViewsChart.jsx';
import RankedBarChart from '../components/RankedBarChart.jsx';
import StateMessage from '../components/StateMessage.jsx';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

// Opened from the "Total Views" card on the Dashboard. Reuses the
// same ads/adsReady stream from AppDataProvider (no new Firestore
// listener here). The per-ad "By Ad" list itself now lives on the
// Active Ads (management) page instead — this page stays analytics-
// only: totals, the daily trend, and the two ranking charts.
export default function ViewsDetail() {
  const { ads, registeredUid } = useAppData();
  const requireRegistered = useRequireRegistered();

  useEffect(() => {
    if (registeredUid) return;
    requireRegistered().catch((err) => console.error(err));
  }, [registeredUid]);

  const [rangeKey, setRangeKey] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  function loadAnalytics() {
    if (!registeredUid) return;
    setAnalyticsReady(false);
    setAnalyticsError(false);
    getSellerAnalytics(registeredUid, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => { setAnalyticsReady(true); setAnalyticsError(true); });
  }
  useEffect(loadAnalytics, [registeredUid, range.days]);

  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);

  const adRankingItems = useMemo(
    () => ads.map((a) => ({ id: a.id, label: a.title, value: a.views || 0 })),
    [ads]
  );
  const categoryItems = useMemo(() => {
    const totals = {};
    ads.forEach((a) => { totals[a.category || 'Other'] = (totals[a.category || 'Other'] || 0) + (a.views || 0); });
    return Object.entries(totals).map(([label, value]) => ({ label, value }));
  }, [ads]);

  return (
    <div className="page">
      <h2 className="page-title">Views</h2>
      <div className="stat-row">
        <div className="stat-card"><div className="val">{totalViews}</div><div className="lbl">Total Views</div></div>
        <div className="stat-card"><div className="val">{ads.length}</div><div className="lbl">Ads Posted</div></div>
      </div>

      <div className="chart-card" style={{ marginTop: 6 }}>
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
          <StateMessage tone="error" icon="alertTriangle" text="Couldn't load this chart." actionLabel="Retry" onAction={loadAnalytics} />
        )}
      </div>

      <div className="chart-card" style={{ marginTop: 14 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="star" size={16} /> All Ads by Views</h3>
        </div>
        <RankedBarChart
          items={adRankingItems}
          limit={5}
          expandable
          scrollCap={7}
          linkTo={(item) => `/dashboard/views/${item.id}`}
          emptyText="Post an ad to see its performance here."
        />
      </div>

      <div className="chart-card" style={{ marginTop: 14 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="grid" size={16} /> Views by Category</h3>
        </div>
        <RankedBarChart items={categoryItems} limit={6} emptyText="No category data yet." />
      </div>
    </div>
  );
}
