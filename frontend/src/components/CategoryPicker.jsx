import React from 'react';
import Icon from './Icon.jsx';

/**
 * Category / subcategory step of the Post Ad wizard. Renders every
 * option as an always-visible icon card (same `.cat-item`/`.cat-icon`
 * classes as the Home page category rail), so the selected one is
 * unmistakably highlighted instead of collapsing into a dropdown
 * that looks identical whether touched or not.
 */
export default function CategoryPicker({ options, value, onChange, icons = true }) {
  return (
    <div className="category-picker-grid">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            className={`cat-item ${active ? 'active' : ''}`}
            onClick={() => onChange(active ? '' : opt.value)}
          >
            {icons && (
              <span className="cat-icon">
                <Icon name={opt.icon || 'grid'} size={18} />
              </span>
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
