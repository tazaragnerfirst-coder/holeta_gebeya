import React from 'react';

// Minimal trend line for a card — no axes, no labels, just the
// shape of the last N days so a glance shows "going up / down /
// flat" without reading numbers. `data`: array of numbers, oldest
// first. Falls back to a flat mid-line when there's nothing to draw
// yet, so a brand-new ad's card doesn't look broken.
export default function Sparkline({ data, width = 84, height = 32, color = 'var(--primary)' }) {
  const values = data && data.length > 0 ? data : [0, 0];
  const max = Math.max(1, ...values);
  const padY = 3;
  const innerH = height - padY * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * step;
    const y = padY + innerH - (v / max) * innerH;
    return [x, y];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const flat = values.every((v) => v === 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="sparkline">
      <path d={path} fill="none" stroke={flat ? 'var(--ink-faint)' : color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={flat ? 0.4 : 1} />
      {!flat && <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />}
    </svg>
  );
}
