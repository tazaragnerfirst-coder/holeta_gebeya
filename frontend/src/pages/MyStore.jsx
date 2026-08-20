import React, { useEffect } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import Icon from '../components/Icon.jsx';
import Sparkline from '../components/Sparkline.jsx';

// UI-only mock for now — no store collection/backend wiring yet.
// Shape mirrors the Seller Dashboard so it's easy to swap in real
// per-store data (views/visits/rating) once that's built.
const MOCK_TREND = [3, 5, 4, 7, 9, 8, 12];

export default function MyStore() {
  const requireRegistered = useRequireRegistered();
  const { registeredUid, ads } = useAppData();

  useEffect(() => {
    if (!registeredUid) requireRegistered().catch(() => {});
  }, [registeredUid]);

  return (
    <div className="page">
      <h2 className="page-title">My Store</h2>

      <div className="plan-card">
        <div className="top"><Icon name="store" size={14} /> Store status</div>
        <h3>Setting up</h3>
        <div className="exp"><Icon name="clock" size={13} /> Your store page is being prepared</div>
      </div>

      <div className="section-title">Store condition</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="val">{ads.length}</div><div className="lbl">Listed Items</div>
        </div>
        <div className="stat-card">
          <div className="val">—</div><div className="lbl">Store Rating</div>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Store visits (last 7 days)</span>
        </div>
        <Sparkline data={MOCK_TREND} width={260} height={54} />
      </div>

      <div className="coming-soon-note">
        Store setup, visit tracking, and reviews are coming soon — this page shows a preview of what's on the way.
      </div>
    </div>
  );
}
