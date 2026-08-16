import React from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import Icon from '../components/Icon.jsx';

// Opened from the "Expired" card on the Dashboard. Nothing today
// ever writes a non-'active' status onto a listing, so this list is
// expected to be empty until an expiry mechanism (manual or
// time-based) is added — the page itself is ready for that data the
// moment it exists.
export default function ExpiredItems() {
  const { ads, adsReady } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);

  const expired = ads.filter((a) => a.status && a.status !== 'active');

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
          <Link to={`/product/${a.id}`} className="ad-row" key={a.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
              {!photo && <Icon name="image" size={16} />}
            </div>
            <div className="info">
              <div className="t">{a.title}</div>
              <div className="p">{a.price} ETB</div>
            </div>
            <div className={`status-pill ${a.status}`}>{a.status}</div>
          </Link>
        );
      })}
    </div>
  );
}
