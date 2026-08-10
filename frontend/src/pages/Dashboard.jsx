import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, ensureLoggedIn } from '../lib/firebase';
import Icon from '../components/Icon.jsx';

export default function Dashboard() {
  const [ads, setAds] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureLoggedIn().then((user) => {
      const q = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
      return onSnapshot(q, (snap) => {
        setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReady(true);
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
          <div className="ad-row" key={a.id}>
            <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
              {!photo && <Icon name="image" size={16} />}
            </div>
            <div className="info">
              <div className="t">{a.title}</div>
              <div className="p">{a.price} ETB</div>
              <div className="metrics"><span><Icon name="eye" size={13} /> {a.views || 0}</span></div>
            </div>
            <div className={`status-pill ${a.status}`}>{a.status}</div>
          </div>
        );
      })}
    </div>
  );
}
