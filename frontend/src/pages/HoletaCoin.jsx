import React from 'react';
import Icon from '../components/Icon.jsx';

export default function HoletaCoin() {
  return (
    <div className="page">
      <h2 className="page-title">Holeta Coin</h2>
      <div className="empty-state">
        <div className="empty-state-icon"><Icon name="coin" size={26} /></div>
        <div className="empty-state-title">Soon…</div>
        <div className="empty-state-sub">Holeta Coin is on its way. We'll let you know when it's ready.</div>
      </div>
    </div>
  );
}
