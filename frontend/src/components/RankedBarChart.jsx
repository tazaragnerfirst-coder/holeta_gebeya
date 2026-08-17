import React from 'react';

// items: [{ label, value }], any length — renders top `limit` by value.
// Shared by the ad-performance ranking and category-breakdown charts
// so the two don't duplicate the same bar-rendering logic.
export default function RankedBarChart({ items, limit = 5, emptyText = 'Nothing to show yet.' }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value).slice(0, limit);

  if (sorted.length === 0) {
    return <div className="chart-empty" style={{ height: 60 }}>{emptyText}</div>;
  }

  const max = Math.max(...sorted.map((i) => i.value));

  return (
    <div className="ranked-bar-chart">
      {sorted.map((item) => (
        <div className="ranked-bar-row" key={item.label}>
          <div className="ranked-bar-label" title={item.label}>{item.label}</div>
          <div className="funnel-track">
            <div className="funnel-bar" style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }} />
          </div>
          <div className="ranked-bar-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
