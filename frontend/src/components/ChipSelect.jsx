import React from 'react';

/**
 * Inline chip-list selector — replaces native <select> so option
 * lists render right where they are (no OS popup). Options can be
 * plain strings or {label, value} objects. Tapping the active chip
 * again clears the selection.
 */
export default function ChipSelect({ options = [], value, onChange, disabled = false, placeholder = '' }) {
  if (disabled) {
    return <div className="chip-select-empty">{placeholder}</div>;
  }
  if (options.length === 0) {
    return <div className="chip-select-empty">{placeholder || 'No options available.'}</div>;
  }
  return (
    <div className="chip-select-row">
      {options.map((o) => {
        const label = typeof o === 'string' ? o : o.label;
        const val = typeof o === 'string' ? o : o.value;
        const active = value === val;
        return (
          <button
            type="button"
            key={val}
            className={`chip ${active ? 'active' : ''}`}
            onClick={() => onChange(active ? '' : val)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
