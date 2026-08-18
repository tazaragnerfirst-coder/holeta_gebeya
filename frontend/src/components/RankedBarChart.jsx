import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// items: [{ id?, label, value }], any length — renders top `limit` by
// value. Shared by the ad-performance ranking, category-breakdown,
// and boost-compare charts so they don't duplicate bar-rendering
// logic.
//
// Pass `expandable` to let a long list grow past `limit`: a "more ▾"
// button first reveals the rest, and once the full list is showing,
// anything past `scrollCap` rows is reached by scrolling inside the
// card instead of pushing the page taller. Pass `linkTo(item)` to
// make each row open somewhere (e.g. that ad's own detail page).
export default function RankedBarChart({
  items,
  limit = 5,
  emptyText = 'Nothing to show yet.',
  expandable = false,
  scrollCap = 7,
  linkTo,
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);

  if (sorted.length === 0) {
    return <div className="chart-empty" style={{ height: 60 }}>{emptyText}</div>;
  }

  const visible = expandable && expanded ? sorted : sorted.slice(0, limit);
  const canExpand = expandable && !expanded && sorted.length > limit;
  const scrollable = expandable && expanded && sorted.length > scrollCap;
  const max = Math.max(...sorted.map((i) => i.value));

  return (
    <div className="ranked-bar-chart">
      <div className={`ranked-bar-rows ${scrollable ? 'ranked-bar-scroll' : ''}`}>
        {visible.map((item) => {
          const inner = (
            <>
              <div className="ranked-bar-label" title={item.label}>{item.label}</div>
              <div className="funnel-track">
                <div className="funnel-bar" style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }} />
              </div>
              <div className="ranked-bar-value">{item.value}</div>
            </>
          );
          const key = item.id || item.label;
          return linkTo ? (
            <Link to={linkTo(item)} className="ranked-bar-row ranked-bar-row-link" key={key}>{inner}</Link>
          ) : (
            <div className="ranked-bar-row" key={key}>{inner}</div>
          );
        })}
      </div>
      {canExpand && (
        <button type="button" className="ranked-bar-more" onClick={() => setExpanded(true)}>
          more ▾
        </button>
      )}
    </div>
  );
}
