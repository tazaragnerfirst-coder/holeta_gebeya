import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd, isPausedAd, isExpired, daysSincePosted } from '../lib/adStatus';
import { getListingAnalyticsBulk, getSellerAnalytics } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import Sparkline from '../components/Sparkline.jsx';
import CombinedTrendChart from '../components/CombinedTrendChart.jsx';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

// Flags an ad as worth a second look, using only data we already
// have (no cross-seller comparison available). Two independent
// signals, either of which is enough to flag:
//  - declining views: this ad's view pace over the second half of
//    its history is well below its first half — momentum is fading.
//  - poor conversion: enough views have come in that a near-zero
//    contact rate isn't just noise.
// Needs a few days of history either way, so brand-new ads are left
// alone until there's something to judge.
function getPerfFlag(ad, days) {
  const age = daysSincePosted(ad);
  if (!age || age < 3) return null;

  const viewsTotal = ad.views || 0;
  const contactsTotal = days.reduce((s, d) => s + (d.contacts || 0), 0);
  const conversionRate = viewsTotal > 0 ? (contactsTotal / viewsTotal) * 100 : null;
  const lowConversion = viewsTotal >= 10 && conversionRate != null && conversionRate < 5;

  let declining = false;
  if (days.length >= 6) {
    const half = Math.floor(days.length / 2);
    const earlierAvg = days.slice(0, half).reduce((s, d) => s + (d.views || 0), 0) / half;
    const recentAvg = days.slice(half).reduce((s, d) => s + (d.views || 0), 0) / (days.length - half);
    declining = earlierAvg > 0.3 && recentAvg < earlierAvg * 0.5;
  }

  if (lowConversion && declining) return { label: 'Views slowing & few contacts' };
  if (lowConversion) return { label: 'Getting views, few contacts' };
  if (declining) return { label: 'Views slowing down' };
  return null;
}

// Opened from the "Active Ads" card on the Dashboard. This is now
// the main ad-management page: a combined views+contacts trend for
// everything not yet expired, then a by-ad list where each card
// carries push (active↔paused), edit, and delete controls. Reuses
// the same ads/adsReady stream from AppDataProvider — deleting or
// toggling status here just writes the Firestore doc; the live
// onSnapshot listener in AppDataProvider picks up the change on its
// own, so no local list state is needed.
export default function AdsManage() {
  const { ads, adsReady, registeredUid } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Active + paused, but not yet expired — expired ads have their
  // own page (Expired) and don't need push/edit/delete here.
  const manageable = ads.filter((a) => !isExpired(a));

  const [perAd, setPerAd] = useState({});

  useEffect(() => {
    if (manageable.length === 0) return;
    getListingAnalyticsBulk(manageable.map((a) => a.id), Infinity).then(setPerAd).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adsReady, manageable.map((a) => a.id).join(',')]);

  const [rangeKey, setRangeKey] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  useEffect(() => {
    if (!registeredUid) return;
    setAnalyticsReady(false);
    getSellerAnalytics(registeredUid, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => setAnalyticsReady(true));
  }, [registeredUid, range.days]);

  async function handleDelete(id) {
    if (!window.confirm('ይህን ማስታወቂያ መሰረዝ ይፈልጋሉ?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'listings', id));
    } catch (err) {
      console.error(err);
      window.alert('መሰረዝ አልተሳካም። እንደገና ይሞክሩ።');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(ad) {
    const next = isPausedAd(ad) ? 'active' : 'paused';
    setTogglingId(ad.id);
    try {
      await updateDoc(doc(db, 'listings', ad.id), { status: next });
    } catch (err) {
      console.error(err);
      window.alert("Couldn't update this ad. Try again.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Manage Ads</h2>

      <div className="chart-card" style={{ marginTop: 6 }}>
        <div className="chart-card-head">
          <h3 className="section-title" style={{ margin: 0 }}><Icon name="trendingUp" size={16} /> All Ads Activity</h3>
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
          ? <CombinedTrendChart data={analytics} />
          : <div className="chart-empty" style={{ height: 140 }}>Loading…</div>}
      </div>

      <h3 className="section-title" style={{ marginTop: 14 }}>By Ad</h3>
      {!adsReady && !timedOut && <p className="helper-text">Loading...</p>}
      {!adsReady && timedOut && (
        <p className="helper-text error-text">
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
      {adsReady && manageable.length === 0 && <p className="helper-text">No active ads right now.</p>}
      {manageable.map((a) => {
        const photo = a.images && a.images[0];
        const days = perAd[a.id] || [];
        const last7 = days.slice(-7).map((d) => d.views || 0);
        const contactsTotal = days.reduce((s, d) => s + (d.contacts || 0), 0);
        const paused = isPausedAd(a);
        const flag = isActiveAd(a) ? getPerfFlag(a, days) : null;
        return (
          <div className="ad-manage-card" key={a.id}>
            <div className="view-ad-card-top">
              <Link to={`/dashboard/views/${a.id}`} className="ad-manage-link-row">
                <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!photo && <Icon name="image" size={16} />}
                </div>
                <div className="info">
                  <div className="t">{a.title}</div>
                  <div className="p">{a.price} ETB</div>
                </div>
                <span className={`status-pill ${paused ? 'paused' : 'active'}`}>{paused ? 'paused' : 'active'}</span>
              </Link>
            </div>
            <div className="view-ad-card-bottom">
              <Sparkline data={last7} />
              <div className="view-ad-card-stats">
                <span><Icon name="eye" size={13} /> {a.views || 0}</span>
                <span><Icon name="chat" size={13} /> {contactsTotal}</span>
              </div>
            </div>
            <div className="ad-manage-actions">
              <button
                type="button"
                className="ad-manage-btn"
                onClick={() => handleToggleStatus(a)}
                disabled={togglingId === a.id}
              >
                <Icon name={paused ? 'play' : 'pause'} size={15} /> {paused ? 'Resume' : 'Pause'}
              </button>
              <Link to={`/edit/${a.id}`} className="ad-manage-btn">
                <Icon name="edit" size={15} /> Edit
              </Link>
              <button
                type="button"
                className="ad-manage-btn ad-manage-btn-danger"
                onClick={() => handleDelete(a.id)}
                disabled={deletingId === a.id}
              >
                <Icon name="xCircle" size={15} /> Delete
              </button>
            </div>
            {flag && (
              <Link to={`/dashboard/views/${a.id}`} className="perf-flag">
                <Icon name="alertTriangle" size={13} />
                <span>{flag.label} — see why & boost</span>
                <span className="perf-flag-arrow">›</span>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
