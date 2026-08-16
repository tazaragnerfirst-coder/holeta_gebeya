import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd, computeExpiresAt } from '../lib/adStatus';
import Icon from '../components/Icon.jsx';

// Opened from the "Expired" card on the Dashboard. An ad lands here
// once its 30-day expiresAt has passed (set at posting time) or its
// status was otherwise moved off 'active'. Ads posted before the
// expiry field existed never age into this list on their own.
export default function ExpiredItems() {
  const { ads, adsReady } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);
  const [renewingId, setRenewingId] = useState(null);

  const expired = ads.filter((a) => !isActiveAd(a));

  async function handleRenew(id) {
    setRenewingId(id);
    try {
      await updateDoc(doc(db, 'listings', id), { status: 'active', expiresAt: computeExpiresAt() });
    } catch (err) {
      console.error(err);
      window.alert('Renew failed. Please try again.');
    } finally {
      setRenewingId(null);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Expired</h2>

      {!adsReady && !timedOut && <p className="helper-text">Loading...</p>}
      {!adsReady && timedOut && (
        <p className="helper-text error-text">
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
      {adsReady && expired.length === 0 && (
        <p className="helper-text">No expired ads yet.</p>
      )}
      {expired.map((a) => {
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
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleRenew(a.id)}
              disabled={renewingId === a.id}
              style={{ padding: '6px 10px', border: '1px solid var(--primary)', borderRadius: 100, background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: renewingId === a.id ? 0.5 : 1 }}
            >
              {renewingId === a.id ? '...' : 'Renew'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
