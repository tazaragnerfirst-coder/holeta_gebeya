import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import Icon from '../components/Icon.jsx';
import { getCached, setCached } from '../lib/pageCache';

export default function Dashboard() {
  const cached = getCached('dashboard:ads');
  const [ads, setAds] = useState(() => cached || []);
  const [ready, setReady] = useState(() => cached !== undefined);
  const requireRegistered = useRequireRegistered();

  useEffect(() => {
    requireRegistered().then((user) => {
      const q = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAds(data);
        setReady(true);
        setCached('dashboard:ads', data);
      });
    }).catch((err) => { console.error(err); setReady(true); });
  }, []);

  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);
  const active = ads.filter((a) => a.status === 'active');

  return (
    <div className="page">
      <h2 className="page-title">Seller Dashboard</h2>
      <div className="stat-row">
        <div className="stat-card"><div className="val">{totalViews}</div><div className="lbl">Total Views</div></div>
        <div className="stat-card"><div className="val">{active.length}</div><div className="lbl">Active Ads</div></div>
        <div className="stat-card"><div className="val">{ads.length - active.length}</div><div className="lbl">Expired</div></div>
      </div>

      <h3 className="section-title">My Ads</h3>
      {!ready && <p className="helper-text">Loading...</p>}
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
