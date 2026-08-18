import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { getListingAnalyticsBulk, getSellerAnalytics } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import Sparkline from '../components/Sparkline.jsx';
import ContactFunnelChart from '../components/ContactFunnelChart.jsx';
import StateMessage from '../components/StateMessage.jsx';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

// Opened from the "Contact Clicks" card on the Dashboard. Mirrors
// ViewsDetail's structure but contacts-focused: an all-time contacts
// total, a Views→Contact funnel with its own range picker, and a
// per-ad breakdown sorted by contacts instead of views.
export default function ContactsDetail() {
  const { ads, adsReady, registeredUid } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);

  // One bulk fetch (all-time) per ad — gives both the accurate
  // all-time contacts total to sort/rank by, and (via the last 7
  // entries) the sparkline trend, without a second round trip.
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

  const sorted = useMemo(() => {
    const contactsFor = (id) => (perAd[id] || []).reduce((s, d) => s + (d.contacts || 0), 0);
    return [...ads].sort((a, b) => contactsFor(b.id) - contactsFor(a.id));
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
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="chat" size={16} /> Views → Contact</h3>
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
          ? <ContactFunnelChart views={rangeViews} contacts={rangeContacts} />
          : <div className="chart-empty" style={{ height: 80 }}>Loading…</div>}
        {analyticsReady && analytics.length === 0 && (
          <p className="helper-text" style={{ marginTop: 8 }}>
            {rangeKey === 'all'
              ? "No contact-click history yet — this tracking started with this update, so it builds up from here."
              : 'No contact clicks recorded yet for this period.'}
          </p>
        )}
      </div>

      <h3 className="section-title">By Ad</h3>
      {!adsReady && !timedOut && <p className="helper-text">Loading...</p>}
      {!adsReady && timedOut && (
        <StateMessage
          tone="error"
          icon="history"
          text="Couldn't load your ads. Check your connection."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      )}
      {adsReady && sorted.length === 0 && (
        <StateMessage text="You haven't posted anything yet." actionLabel="Post an ad" actionTo="/post" />
      )}
      {sorted.map((a) => {
        const photo = a.images && a.images[0];
        const days = perAd[a.id] || [];
        const last7 = days.slice(-7).map((d) => d.contacts || 0);
        const contactsTotal = days.reduce((s, d) => s + (d.contacts || 0), 0);
        return (
          <Link to={`/dashboard/views/${a.id}`} className="view-ad-card" key={a.id}>
            <div className="view-ad-card-top">
              <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                {!photo && <Icon name="image" size={16} />}
              </div>
              <div className="info">
                <div className="t">{a.title}</div>
                <div className="p">{a.price} ETB</div>
              </div>
              <span className="detail-tag">Detail</span>
            </div>
            <div className="view-ad-card-bottom">
              <Sparkline data={last7} />
              <div className="view-ad-card-stats">
                <span><Icon name="chat" size={13} /> {contactsTotal}</span>
                <span><Icon name="eye" size={13} /> {a.views || 0}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
