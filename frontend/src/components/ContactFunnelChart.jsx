import React from 'react';

// Two-stage funnel: listing views opened -> contact clicks (call or
// chat). No impression tracking exists yet, so this starts at "views"
// rather than a full 3-stage impression->view->contact funnel.
export default function ContactFunnelChart({ views, contacts }) {
  const rate = views > 0 ? Math.round((contacts / views) * 100) : 0;
  const stages = [
    { label: 'Views', value: views, pct: 100 },
    { label: 'Contact clicks', value: contacts, pct: views > 0 ? Math.min(100, (contacts / views) * 100) : 0 },
  ];

  return (
    <div className="funnel-chart">
      {stages.map((s) => (
        <div className="funnel-row" key={s.label}>
          <div className="funnel-track">
            <div className="funnel-bar" style={{ width: `${Math.max(s.pct, s.value > 0 ? 6 : 0)}%` }} />
          </div>
          <div className="funnel-meta">
            <span className="funnel-label">{s.label}</span>
            <span className="funnel-value">{s.value}</span>
          </div>
        </div>
      ))}
      {views > 0 && (
        <div className="funnel-rate">{rate}% of viewers contacted the seller</div>
      )}
    </div>
  );
}
