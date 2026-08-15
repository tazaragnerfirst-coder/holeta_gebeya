import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const RECENT_KEY = 'hg_recent_searches';
const MAX_RECENT = 6;

export function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function pushRecentSearch(term) {
  const t = term.trim();
  if (!t) return;
  const list = [t, ...getRecentSearches().filter((s) => s.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

export default function SearchHeader({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  popularTags = [],
  categories = [],
  activeCategory,
  onCategoryChange,
  onOpenFilters,
  activeFilterCount = 0,
  onSearchFocus,
}) {
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(getRecentSearches());
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, []);

  const typing = focused && value.trim().length > 0;
  const showIdlePanel = focused && value.trim().length === 0 && (recent.length > 0 || popularTags.length > 0);

  function commit(term) {
    onChange(term);
    pushRecentSearch(term);
    setRecent(getRecentSearches());
    onSubmit?.(term);
    setFocused(false);
  }

  return (
    <div className="search-header" ref={wrapRef}>
      <div className={`search-bar ${focused ? 'is-focused' : ''}`}>
        <Icon name="search" size={17} style={{ color: 'var(--ink-faint)', flex: '0 0 auto' }} />
        <input
          placeholder="Search listings..."
          value={value}
          onFocus={() => { setFocused(true); onSearchFocus?.(); }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) commit(value);
            if (e.key === 'Escape') { e.currentTarget.blur(); setFocused(false); }
          }}
        />
        {value && (
          <Icon
            name="xCircle"
            size={17}
            style={{ color: 'var(--ink-faint)', cursor: 'pointer', flex: '0 0 auto' }}
            onClick={() => onChange('')}
          />
        )}
        <span className="search-divider" />
        <button
          type="button"
          className="filter-btn"
          aria-label="Advanced filters"
          onClick={() => { setFocused(false); onOpenFilters(); }}
        >
          <Icon name="sliders" size={17} />
          {activeFilterCount > 0 && <span className="filter-dot" />}
        </button>
      </div>

      {(showIdlePanel || typing) && (
        <div className="search-panel">
          {typing && (
            suggestions.length > 0 ? (
              <ul className="suggestion-list">
                {suggestions.slice(0, 6).map((s) => (
                  <li key={s} onMouseDown={() => commit(s)}>
                    <Icon name="search" size={14} style={{ color: 'var(--ink-faint)' }} />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="suggestion-empty">Press Enter to search "{value.trim()}"</div>
            )
          )}

          {showIdlePanel && (
            <>
              {recent.length > 0 && (
                <div className="panel-section">
                  <div className="panel-section-head">
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      className="link-btn"
                      onMouseDown={() => { clearRecentSearches(); setRecent([]); }}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="tag-row">
                    {recent.map((r) => (
                      <button type="button" key={r} className="tag-chip" onMouseDown={() => commit(r)}>
                        <Icon name="history" size={12} /> {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {popularTags.length > 0 && (
                <div className="panel-section">
                  <div className="panel-section-head"><span>Popular in Holeta</span></div>
                  <div className="tag-row">
                    {popularTags.map((t) => (
                      <button type="button" key={t} className="tag-chip tag-chip-accent" onMouseDown={() => commit(t)}>
                        <Icon name="trendingUp" size={12} /> {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {categories.length > 0 && (
        <div className="chip-row cat-chip-row">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`chip cat-chip ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => onCategoryChange(activeCategory === c.id ? null : c.id)}
            >
              <Icon name={c.icon || 'grid'} size={14} /> {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
