import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { isActiveAd } from '../lib/adStatus';
import Icon from '../components/Icon.jsx';

export default function Dashboard() {
  const { ads, adsReady, registeredUid } = useAppData();
  const requireRegistered = useRequireRegistered();

  useEffect(() => {
    if (registeredUid) return;
    requireRegistered().catch((err) => console.error(err));
  }, [registeredUid]);

  const ready = adsReady;
  const timedOut = useLoadTimeout(ready, 3000);

  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);
  const active = ads.filter(isActiveAd);

  return (
    <div className="page">
      <h2 className="page-title">Seller Dashboard</h2>
      <div className="stat-row">
        <Link to="/dashboard/views" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="val">{totalViews}</div><div className="lbl">Total Views</div>
        </Link>
        <Link to="/dashboard/ads" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="val">{active.length}</div><div className="lbl">Active Ads</div>
        </Link>
        <Link to="/dashboard/expired" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="val">{ads.length - active.length}</div><div className="lbl">Expired</div>
        </Link>
      </div>

      <h3 className="section-title">My Ads</h3>
      {!ready && !timedOut && <p className="helper-text">Loading...</p>}
      {!ready && timedOut && (
        <p className="helper-text error-text">
          Couldn't load your ads. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
      {ready && ads.length === 0 && <p className="helper-text">You haven't posted anything yet.</p>}
      {ads.map((a) => {
        const photo = a.images && a.images[0];
        return (
          <Link to={`/product/${a.id}`} className="ad-row" key={a.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
              {!photo && <Icon name="image" size={16} />}
            </div>
            <div className="info">
              <div className="t">{a.title}</div>
              <div className="p">{a.price} ETB</div>
              <div className="metrics"><span><Icon name="eye" size={13} /> {a.views || 0}</span></div>
            </div>
            <div className={`status-pill ${a.status}`}>{a.status}</div>
          </Link>
        );
      })}
    </div>
  );
}
