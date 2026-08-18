import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd, daysSincePosted } from '../lib/adStatus';
import { getListingAnalyticsBulk } from '../lib/analytics';
import Icon from '../components/Icon.jsx';

// Flags an active ad as worth a second look, using only data we
// already have (no cross-seller comparison available). Two
// independent signals, either of which is enough to flag:
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

// Opened from the "Active Ads" card on the Dashboard. Reuses the
// same ads/adsReady stream from AppDataProvider — deleting here just
// removes the Firestore doc; the live onSnapshot listener in
// AppDataProvider then drops it from `ads` on its own, so no local
// list state is needed.
export default function AdsManage() {
  const { ads, adsReady } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);
  const [deletingId, setDeletingId] = useState(null);

  const active = ads.filter(isActiveAd);

  const [perAd, setPerAd] = useState({});

  useEffect(() => {
    if (active.length === 0) return;
    getListingAnalyticsBulk(active.map((a) => a.id), Infinity).then(setPerAd).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adsReady, active.map((a) => a.id).join(',')]);

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

  return (
    <div className="page">
      <h2 className="page-title">Manage Ads</h2>

      {!adsReady && !timedOut && <p className="helper-text">Loading...</p>}
      {!adsReady && timedOut && (
        <p className="helper-text error-text">
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
      {adsReady && active.length === 0 && <p className="helper-text">No active ads right now.</p>}
      {active.map((a) => {
        const photo = a.images && a.images[0];
        const flag = getPerfFlag(a, perAd[a.id] || []);
        return (
          <div key={a.id} className="ad-row-wrap">
            <div className="ad-row">
              <Link to={`/product/${a.id}`} style={{ display: 'flex', flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!photo && <Icon name="image" size={16} />}
                </div>
                <div className="info">
                  <div className="t">{a.title}</div>
                  <div className="p">{a.price} ETB</div>
                  <div className="metrics"><span><Icon name="eye" size={13} /> {a.views || 0}</span></div>
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link
                  to={`/edit/${a.id}`}
                  aria-label="Edit ad"
                  style={{ padding: '6px 10px', color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  aria-label="Delete ad"
                  style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: 'var(--error, #C0392B)', opacity: deletingId === a.id ? 0.5 : 1 }}
                >
                  <Icon name="xCircle" size={20} />
                </button>
              </div>
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
