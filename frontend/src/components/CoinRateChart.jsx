import React from 'react';

// points: [{rate, createdAt}], already sorted ascending (oldest
// first) — one per trade, same draw-in animation approach as
// DailyRateChart. Color follows the trend (up = --primary/ok, down =
// --safety) instead of always being the brand color, since that's
// the whole point of a trade chart.
export default function CoinRateChart({ points, height = 140 }) {
  const w = 320;
  const h = height;
  const padL = 8, padR = 8, padT = 18, padB = 10;

  const data = (points || []).filter((p) => typeof p.rate === 'number');

  if (data.length < 2) {
    return (
      <div className="chart-empty" style={{ height }}>
        Not enough trades yet to chart.
      </div>
    );
  }

  const rates = data.map((d) => d.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = innerW / (data.length - 1);

  const points_xy = data.map((d, i) => {
    const x = padL + i * step;
    const y = padT + innerH - ((d.rate - min) / range) * innerH;
    return [x, y];
  });

  const linePath = points_xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points_xy[points_xy.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${points_xy[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const firstRate = data[0].rate;
  const lastRate = data[data.length - 1].rate;
  const trendUp = lastRate >= firstRate;
  const lineColor = trendUp ? 'var(--primary)' : 'var(--safety)';
  const tintColor = trendUp ? 'var(--primary-tint)' : 'var(--safety-tint)';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="coin-rate-chart">
      <path d={areaPath} className="chart-area-fade" fill={tintColor} stroke="none" />
      <path d={linePath} pathLength="1" className="chart-line-draw" fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points_xy[points_xy.length - 1][0]} cy={points_xy[points_xy.length - 1][1]} r="3.2" className="chart-dot-pop" fill={lineColor} />
    </svg>
  );
}
