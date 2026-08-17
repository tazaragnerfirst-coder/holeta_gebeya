import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { getListingAnalyticsBulk } from '../lib/analytics';
import Icon from '../components/Icon.jsx';
import Sparkline from '../components/Sparkline.jsx';
import StateMessage from '../components/StateMessage.jsx';

// Opened from the "Total Views" card on the Dashboard. Reuses the
// same ads/adsReady stream from AppDataProvider (no new Firestore
// listener here) for the list itself, plus one extra bulk query for
// the last-7-days per-ad trend used in each card's sparkline. Each
// card is a compact summary — tap "Detail" (or the card) to open the
// full breakdown for that ad.
export default function ViewsDetail() {
  const { ads, adsReady } = useAppData();
  const timedOut = useLoadTimeout(adsReady, 3000);

  const [trends, setTrends] = useState({});

  useEffect(() => {
    if (!adsReady || ads.length === 0) return;
    getListingAnalyticsBulk(ads.map((a) => a.id), 7).then(setTrends).catch(() => {});
  }, [adsReady, ads]);

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
        const daily = (trends[a.id] || []).map((d) => d.views || 0);
        const contacts7d = (trends[a.id] || []).reduce((s, d) => s + (d.contacts || 0), 0);
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
              <Sparkline data={daily} />
              <div className="view-ad-card-stats">
                <span><Icon name="eye" size={13} /> {a.views || 0}</span>
                <span><Icon name="chat" size={13} /> {contacts7d}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
