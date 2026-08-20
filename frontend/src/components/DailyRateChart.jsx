import React from 'react';

// data: [{date, views, contacts}], already sorted ascending. Plots
// the daily views→contact conversion rate (contacts/views * 100) as
// a vertical line chart — same rendering approach as
// DailyViewsChart, but the y-axis is a percentage instead of a raw
// count.
export default function DailyRateChart({ data, height = 140 }) {
  const w = 320;
  const h = height;
  const padL = 8, padR = 8, padT = 18, padB = 22;

  const points_data = (data || []).map((d) => ({
    date: d.date,
    pct: d.views > 0 ? Math.round((d.contacts / d.views) * 1000) / 10 : 0,
  }));

  if (points_data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        No data yet in this period.
      </div>
    );
  }

  const max = Math.max(10, ...points_data.map((d) => d.pct));
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = points_data.length > 1 ? innerW / (points_data.length - 1) : 0;

  const points = points_data.map((d, i) => {
    const x = padL + i * step;
    const y = padT + innerH - (d.pct / max) * innerH;
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${points[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const labelEvery = Math.max(1, Math.ceil(points_data.length / 4));
  const lastPct = points_data[points_data.length - 1].pct;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="daily-views-chart">
      <path d={areaPath} fill="var(--primary-tint)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <text x={points[points.length - 1][0]} y={Math.max(10, points[points.length - 1][1] - 8)} fontSize="9" fontWeight="700" fill="var(--primary)" textAnchor="middle">
        {lastPct}%
      </text>
      {points.map(([x, y], i) => (
        i === points.length - 1
          ? <circle key={i} cx={x} cy={y} r="3.2" fill="var(--primary)" />
          : null
      ))}
      {points_data.map((d, i) => (
        i % labelEvery === 0 || i === points_data.length - 1
          ? (
            <text key={d.date} x={padL + i * step} y={h - 6} fontSize="8" fill="var(--ink-faint)" textAnchor="middle">
              {d.date.slice(5)}
            </text>
          )
          : null
      ))}
    </svg>
  );
}
