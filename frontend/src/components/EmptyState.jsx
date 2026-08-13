import React from 'react';
import Icon from './Icon.jsx';

export default function EmptyState({ term, suggestions = [], onSuggestionClick, onClear }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon name="frown" size={30} /></div>
      <div className="empty-state-title">No items found</div>
      <div className="empty-state-sub">
        {term ? <>Nothing matched "{term}". Try a different keyword.</> : 'Try adjusting your filters.'}
      </div>
      {suggestions.length > 0 && (
        <div className="tag-row" style={{ justifyContent: 'center', marginTop: 14 }}>
          {suggestions.map((s) => (
            <button type="button" key={s} className="tag-chip tag-chip-accent" onClick={() => onSuggestionClick(s)}>
              <Icon name="trendingUp" size={12} /> {s}
            </button>
          ))}
        </div>
      )}
      {onClear && (
        <button type="button" className="link-btn" style={{ marginTop: 14 }} onClick={onClear}>
          Clear search & filters
        </button>
      )}
    </div>
  );
}
