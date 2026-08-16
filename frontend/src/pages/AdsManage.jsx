import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd } from '../lib/adStatus';
import Icon from '../components/Icon.jsx';

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
        return (
          <div className="ad-row" key={a.id}>
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
        );
      })}
    </div>
  );
}
