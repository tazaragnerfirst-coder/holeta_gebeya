import React from 'react';

// Deterministic 2-column masonry. CSS `column-count`'s default
// "balance" fill recalculates the whole layout — and can visually
// move already-rendered cards between columns — every time content
// grows, which is exactly what caused new posts to reshuffle the
// feed. Here each item's column is fixed purely by its own position
// among the non-job items around it, so appending items at the end
// can never move a card that's already on screen. Job posts (which
// have no category and render full-width, see #hog009) split the
// item list into runs so a full-width break doesn't shift the
// left/right assignment of items before or after it.
export default function ListingGrid({ items, renderItem }) {
  const segments = [];
  let run = [];
  items.forEach((item, i) => {
    if (item && item.categoryType === 'job') {
      if (run.length) { segments.push({ type: 'cols', run }); run = []; }
      segments.push({ type: 'full', item, i });
    } else {
      run.push({ item, i });
    }
  });
  if (run.length) segments.push({ type: 'cols', run });

  return (
    <div className="listing-grid">
      {segments.map((seg, si) => {
        if (seg.type === 'full') {
          return <div key={`full-${si}`} className="listing-grid-full">{renderItem(seg.item, seg.i)}</div>;
        }
        const left = seg.run.filter((_, idx) => idx % 2 === 0);
        const right = seg.run.filter((_, idx) => idx % 2 === 1);
        return (
          <div key={`cols-${si}`} className="listing-grid-cols">
            <div className="listing-grid-col">{left.map(({ item, i }) => renderItem(item, i))}</div>
            <div className="listing-grid-col">{right.map(({ item, i }) => renderItem(item, i))}</div>
          </div>
        );
      })}
    </div>
  );
}
