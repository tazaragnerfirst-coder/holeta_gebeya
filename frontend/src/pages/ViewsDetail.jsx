import React from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import Icon from '../components/Icon.jsx';

// Opened from the "Total Views" card on the Dashboard. Reuses the
// same ads/adsReady stream from AppDataProvider (no new Firestore
// listener here), just sorted and presented differently.
export default function ViewsDetail() {
  const { ads, adsReady } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);

  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);
  const sorted = [...ads].sort((a, b) => (b.views || 0) - (a.views || 0));

  return (
    <div className="page">
      <h2 className="page-title">Views</h2>
      <div className="stat-row">
        <div className="stat-card"><div className="val">{totalViews}</div><div className="lbl">Total Views</div></div>
        <div className="stat-card"><div className="val">{ads.length}</div><div className="lbl">Ads Posted</div></div>
      </div>

      <h3 className="section-title">By Ad</h3>
      {!adsReady && !timedOut && <p className="helper-text">Loading...</p>}
      {!adsReady && timedOut && (
        <p className="helper-text error-text">
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
      {adsReady && sorted.length === 0 && <p className="helper-text">You haven't posted anything yet.</p>}
      {sorted.map((a) => {
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
            <div className="metrics" style={{ fontWeight: 700 }}><Icon name="eye" size={14} /> {a.views || 0}</div>
          </Link>
        );
      })}
    </div>
  );
}
