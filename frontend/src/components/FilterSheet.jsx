import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'];

export default function FilterSheet({ open, onClose, filters, onApply }) {
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? '');
  const [conditions, setConditions] = useState(filters.conditions || []);

  useEffect(() => {
    if (open) {
      setMinPrice(filters.minPrice ?? '');
      setMaxPrice(filters.maxPrice ?? '');
      setConditions(filters.conditions || []);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  function toggleCondition(c) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function reset() {
    setMinPrice('');
    setMaxPrice('');
    setConditions([]);
  }

  function apply() {
    onApply({
      minPrice: minPrice === '' ? null : Number(minPrice),
      maxPrice: maxPrice === '' ? null : Number(maxPrice),
      conditions,
    });
    onClose();
  }

  return (
    // Fixed-position overlay anchored near the search bar — floats
    // above the page instead of sitting inline and pushing the
    // category row / listings down. Tapping the dimmed backdrop
    // closes it, same as the search suggestions panel.
    <div className="filter-backdrop" onClick={onClose}>
      <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>Filters</h3>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <div className="filter-block">
            <div className="filter-label">Price Range (ETB)</div>
            <div className="price-range-row">
              <input type="number" inputMode="numeric" placeholder="Min" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <span className="price-range-dash">—</span>
              <input type="number" inputMode="numeric" placeholder="Max" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-label">Condition</div>
            <div className="tag-row">
              {CONDITIONS.map((c) => (
                <button type="button" key={c} className={`tag-chip ${conditions.includes(c) ? 'tag-chip-selected' : ''}`} onClick={() => toggleCondition(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={reset}>Reset</button>
          <button type="button" className="btn-primary" onClick={apply}>Apply Filters</button>
        </div>
      </div>
    </div>
  );
}
