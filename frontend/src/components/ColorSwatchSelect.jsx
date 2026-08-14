import React from 'react';
import Icon from './Icon.jsx';
import { colorHex } from '../data/colors';

/**
 * Small color-box selector — used instead of free-text color input.
 * Only the colors actually available for the selected model/item are
 * shown (passed in via `options`).
 */
export default function ColorSwatchSelect({ options = [], value, onChange, placeholder = '' }) {
  if (options.length === 0) {
    return <div className="chip-select-empty">{placeholder || 'No options available.'}</div>;
  }
  return (
    <div className="swatch-row">
      {options.map((name) => {
        const active = value === name;
        const hex = colorHex(name);
        const light = /^#f|^#e[5-9a-f]/i.test(hex);
        return (
          <button
            type="button"
            key={name}
            className={`swatch ${active ? 'active' : ''}`}
            style={{ background: hex }}
            title={name}
            aria-label={name}
            aria-pressed={active}
            onClick={() => onChange(active ? '' : name)}
          >
            {active && <Icon name="checkCircle" size={14} style={{ color: light ? '#1a1a1a' : '#fff' }} />}
          </button>
        );
      })}
      {value && <span className="swatch-selected-label">{value}</span>}
    </div>
  );
}
