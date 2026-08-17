import React, { useState } from 'react';
import Icon from './Icon.jsx';

// Reused on the Dashboard (aggregate, across all ads) and on the
// per-ad detail page (that one ad vs the seller's others). Purchase
// isn't built yet, so the CTA just reveals a short "coming soon"
// note instead of linking anywhere — see project notes.
export default function BoostCard({ title = 'Boost your reach', description, compare, ctaLabel = 'Boost an ad' }) {
  const [showNote, setShowNote] = useState(false);
  const max = compare && compare.length > 0 ? Math.max(...compare.map((c) => c.value), 0.1) : 0;

  return (
    <div className="boost-card">
      <div className="top"><Icon name="trendingUp" size={13} /> Boost</div>
      <p style={{ marginTop: 4, marginBottom: compare ? 10 : 12, fontWeight: 700, fontSize: 14, color: '#fff' }}>{title}</p>
      {description && <p style={{ marginTop: -6 }}>{description}</p>}

      {compare && compare.length > 0 && (
        <div className="boost-compare">
          {compare.map((c) => (
            <div className="boost-compare-item" key={c.label}>
              <div className="n">{c.value}</div>
              <div className="l">{c.label}</div>
              <div className="boost-compare-track">
                <div className="boost-compare-fill" style={{ width: `${Math.max((c.value / max) * 100, 4)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="boost-cta" onClick={() => setShowNote(true)} disabled={showNote}>
        <Icon name="star" size={13} /> {ctaLabel}
      </button>
      {showNote && <div className="boost-note">Boosting is coming soon — we'll let you know when it's ready.</div>}
    </div>
  );
}
