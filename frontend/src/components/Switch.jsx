import React from 'react';

// Minimal controlled on/off switch — used on Settings rows (e.g.
// Vibrant). Stateless: parent owns `checked` and reacts to onChange.
export default function Switch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!checked); }}
    >
      <span className="switch-thumb" />
    </button>
  );
}
