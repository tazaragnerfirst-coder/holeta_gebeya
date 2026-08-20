import React from 'react';
import Icon from '../components/Icon.jsx';
import BoostCard from '../components/BoostCard.jsx';

const BENEFITS = [
  { icon: 'eye', t: 'More views', d: 'Boosted ads appear first in search and category listings' },
  { icon: 'chat', t: 'More contacts', d: 'Buyers see your ad sooner, so you hear from them sooner' },
  { icon: 'clock', t: 'Faster sales', d: 'Boosted ads typically sell faster than regular ones' },
];

export default function BoostPromo() {
  return (
    <div className="page">
      <h2 className="page-title">Boost My Ads</h2>

      <BoostCard
        title="Get seen first"
        description="Boosted ads are shown ahead of regular listings across the app."
        ctaLabel="Boost an ad"
      />

      <div className="feature-list">
        {BENEFITS.map((b) => (
          <div className="feature-row" key={b.t}>
            <div className="fi"><Icon name={b.icon} size={15} /></div>
            <div>
              {b.t}
              <div style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 1 }}>{b.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
