import React from 'react';

// data: [{date, views, contacts}], already sorted ascending. Draws
// two lines (views + contacts) sharing one y-axis scale, so the
// Active Ads page can show the whole account's daily activity at a
// glance without needing two separate charts. Same plain-SVG
// approach as DailyViewsChart — no charting library.
export default function CombinedTrendChart({ data, height = 140 }) {
  const w = 320;
  const h = height;
  const padL = 8, padR = 8, padT = 12, padB = 22;

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        No activity yet in this period.
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => Math.max(d.views || 0, d.contacts || 0)));
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  function lineFor(key) {
    const points = data.map((d, i) => {
      const x = padL + i * step;
      const y = padT + innerH - ((d[key] || 0) / max) * innerH;
      return [x, y];
    });
    const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { path, last: points[points.length - 1] };
  }

  const viewsLine = lineFor('views');
  const contactsLine = lineFor('contacts');
  const labelEvery = Math.max(1, Math.ceil(data.length / 4));

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="daily-views-chart">
        <path d={viewsLine.path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={contactsLine.path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={viewsLine.last[0]} cy={viewsLine.last[1]} r="3" fill="var(--primary)" />
        <circle cx={contactsLine.last[0]} cy={contactsLine.last[1]} r="3" fill="var(--accent)" />
        {data.map((d, i) => (
          i % labelEvery === 0 || i === data.length - 1
            ? (
              <text key={d.date} x={padL + i * step} y={h - 6} fontSize="8" fill="var(--ink-faint)" textAnchor="middle">
                {d.date.slice(5)}
              </text>
            )
            : null
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="legend-dot" style={{ background: 'var(--primary)' }} /> Views</span>
        <span><i className="legend-dot" style={{ background: 'var(--accent)' }} /> Contact clicks</span>
      </div>
    </div>
  );
}
