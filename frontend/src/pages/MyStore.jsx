import React, { useEffect } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import Icon from '../components/Icon.jsx';
import Sparkline from '../components/Sparkline.jsx';

// Store status, listed-item count, and rating are wired to real data
// (ads array + existing sellerRating from appData). Store *visits*
// are still a mock trend — no visit-tracking collection built yet.
const MOCK_TREND = [3, 5, 4, 7, 9, 8, 12];

export default function MyStore() {
  const requireRegistered = useRequireRegistered();
  const { registeredUid, ads, sellerRating } = useAppData();

  useEffect(() => {
    if (!registeredUid) requireRegistered().catch(() => {});
  }, [registeredUid]);

  const isActive = ads.length > 0;

  return (
    <div className="page">
      <h2 className="page-title">My Store</h2>

      <div className="plan-card">
        <div className="top"><Icon name="store" size={14} /> Store status</div>
        <h3>{isActive ? 'Active' : 'Setting up'}</h3>
        <div className="exp">
          {isActive
            ? <><Icon name="check" size={13} /> Your store is live with {ads.length} listed item{ads.length === 1 ? '' : 's'}</>
            : <><Icon name="clock" size={13} /> Post your first item to activate your store</>}
        </div>
      </div>

      <div className="section-title">Store condition</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="val">{ads.length}</div><div className="lbl">Listed Items</div>
        </div>
        <div className="stat-card">
          <div className="val">{sellerRating.count > 0 ? sellerRating.avg.toFixed(1) : '—'}</div>
          <div className="lbl">{sellerRating.count > 0 ? `Store Rating (${sellerRating.count})` : 'Store Rating'}</div>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Store visits (last 7 days)</span>
        </div>
        <Sparkline data={MOCK_TREND} width={260} height={54} />
      </div>

      <div className="coming-soon-note">
        Store visit tracking is coming soon — the chart above is a preview of what's on the way.
      </div>
    </div>
  );
}
