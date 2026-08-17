import React from 'react';

// data: [{date: 'YYYY-MM-DD', views: number}], already sorted ascending.
// No charting library — the app has none, and one line chart doesn't
// justify adding a dependency. Plain SVG, sized to the card.
export default function DailyViewsChart({ data, height = 140 }) {
  const w = 320;
  const h = height;
  const padL = 8, padR = 8, padT = 12, padB = 22;

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        No views yet in this period.
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.views));
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padL + i * step;
    const y = padT + innerH - (d.views / max) * innerH;
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${points[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  // Show a handful of date labels, not one per point, so short
  // month-day strings don't collide on a narrow phone screen.
  const labelEvery = Math.max(1, Math.ceil(data.length / 4));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="daily-views-chart">
      <path d={areaPath} fill="var(--primary-tint)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        i === points.length - 1
          ? <circle key={i} cx={x} cy={y} r="3.2" fill="var(--primary)" />
          : null
      ))}
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
  );
}
