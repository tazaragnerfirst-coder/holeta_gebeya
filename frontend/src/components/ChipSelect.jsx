import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Inline dropdown selector — replaces native <select> without using
 * an OS popup and without boxed/wrapped chips. Tapping the field
 * expands a plain vertical list directly below it, in the normal
 * page flow. Options can be plain strings or {label, value} objects.
 *
 * `otherValue`/`onOtherChange` (both optional, #hog022): when passed
 * and the current selection is literally "Other", the trigger's own
 * label turns into a text input right where "Other" was shown,
 * instead of a separate box appearing elsewhere — Taza's ask was
 * specifically that typing happen "right there at Other", not below
 * it. A small chevron button stays next to it to reopen the list if
 * they want to pick something else instead.
 */
export default function ChipSelect({ options = [], value, onChange, disabled = false, placeholder = '', otherValue, onOtherChange }) {
  const [open, setOpen] = useState(false);
  const otherInputRef = useRef(null);

  const norm = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  const selected = norm.find((o) => o.value === value);
  const isOtherEditing = selected?.value === 'Other' && typeof onOtherChange === 'function';

  useEffect(() => {
    if (isOtherEditing) otherInputRef.current?.focus();
    // Only on the transition into Other — not on every otherValue keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOtherEditing]);

  if (disabled) {
    return <div className="chip-select-empty">{placeholder}</div>;
  }
  if (options.length === 0) {
    return <div className="chip-select-empty">{placeholder || 'No options available.'}</div>;
  }

  return (
    <div className="inline-select">
      {isOtherEditing ? (
        <div className={`inline-select-trigger has-value is-other-editing ${open ? 'is-open' : ''}`}>
          <Icon name="checkCircle" size={16} className="inline-select-check" />
          <input
            ref={otherInputRef}
            className="inline-select-other-input"
            type="text"
            value={otherValue || ''}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Please specify…"
          />
          <button type="button" className="inline-select-reopen" onClick={() => setOpen((o) => !o)}>
            <Icon name="chevronDown" size={16} className={open ? 'rotated' : ''} />
          </button>
        </div>
      ) : (
        <button type="button" className={`inline-select-trigger ${selected ? 'has-value' : ''} ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)}>
          {selected && <Icon name="checkCircle" size={16} className="inline-select-check" />}
          <span className={selected ? 'selected-label' : 'placeholder'}>{selected ? selected.label : (placeholder || 'Select...')}</span>
          <Icon name="chevronDown" size={16} className={open ? 'rotated' : ''} />
        </button>
      )}
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
