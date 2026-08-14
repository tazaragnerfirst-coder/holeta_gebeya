import React, { useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Inline dropdown selector — replaces native <select> without using
 * an OS popup and without boxed/wrapped chips. Tapping the field
 * expands a plain vertical list directly below it, in the normal
 * page flow. Options can be plain strings or {label, value} objects.
 */
export default function ChipSelect({ options = [], value, onChange, disabled = false, placeholder = '' }) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return <div className="chip-select-empty">{placeholder}</div>;
  }
  if (options.length === 0) {
    return <div className="chip-select-empty">{placeholder || 'No options available.'}</div>;
  }

  const norm = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  const selected = norm.find((o) => o.value === value);

  return (
    <div className="inline-select">
      <button type="button" className="inline-select-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={selected ? '' : 'placeholder'}>{selected ? selected.label : (placeholder || 'Select...')}</span>
        <Icon name="chevronDown" size={16} className={open ? 'rotated' : ''} />
      </button>
      {open && (
        <div className="inline-select-list">
          {norm.map((o) => {
            const active = o.value === value;
            return (
              <button
                type="button"
                key={o.value}
                className={`inline-select-item ${active ? 'active' : ''}`}
                onClick={() => { onChange(active ? '' : o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {active && <Icon name="check" size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
