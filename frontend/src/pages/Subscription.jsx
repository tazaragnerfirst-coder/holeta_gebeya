import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function Subscription() {
  const navigate = useNavigate();

  const menu = [
    { icon: 'crown', t: 'My Subscription', sub: 'Plan status & perks', onClick: () => navigate('/subscription/status') },
    { icon: 'trendingUp', t: 'Boost My Ads', sub: 'Get more views & buyers', onClick: () => navigate('/subscription/boost') },
  ];

  return (
    <div className="page">
      <h2 className="page-title">Subscription</h2>

      <div className="menu-list">
        {menu.map((m) => (
          <div className="menu-item" key={m.t} onClick={m.onClick}>
            <div className="menu-icon"><Icon name={m.icon} size={17} /></div>
            <div className="t">
              {m.t}
              <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-faint)', marginTop: 1 }}>{m.sub}</span>
            </div>
            <div className="chev"><Icon name="chevronLeft" size={16} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
