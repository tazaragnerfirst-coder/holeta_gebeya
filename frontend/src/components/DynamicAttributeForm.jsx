import React from 'react';

/**
 * Renders form fields from a subcategory's `attributes` schema
 * (see src/data/categories.js). Keeps values in a flat object keyed
 * by attribute.key, passed up via onChange.
 */
export default function DynamicAttributeForm({ attributes, values, onChange }) {
  const setField = (key, value) => onChange({ ...values, [key]: value });

  return (
    <div className="attr-form">
      {attributes.map((attr) => (
        <div className="field-group" key={attr.key}>
          <label className="field-label">
            {attr.label}
            {attr.required && <span className="req">*</span>}
          </label>
          {renderInput(attr, values, setField)}
        </div>
      ))}
    </div>
  );
}

function renderInput(attr, values, setField) {
  const value = values[attr.key] ?? '';

  switch (attr.type) {
    case 'select': {
      return (
        <select className="field" value={value} onChange={(e) => setField(attr.key, e.target.value)}>
          <option value="">Select...</option>
          {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    case 'select-dependent': {
      const parentValue = values[attr.dependsOn];
      const options = (parentValue && attr.optionsByParent[parentValue]) || [];
      return (
        <select
          className="field"
          value={value}
          disabled={!parentValue}
          onChange={(e) => setField(attr.key, e.target.value)}
        >
          <option value="">{parentValue ? 'Select model...' : `Select ${attr.dependsOn} first`}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    case 'number':
      return (
        <input
          className="field" type="number" value={value} placeholder={attr.placeholder || ''}
          onChange={(e) => setField(attr.key, e.target.value)}
        />
      );
    case 'boolean':
      return (
        <div className="toggle-row">
          <button type="button" className={`chip ${value === true ? 'active' : ''}`} onClick={() => setField(attr.key, true)}>Yes</button>
          <button type="button" className={`chip ${value === false ? 'active' : ''}`} onClick={() => setField(attr.key, false)}>No</button>
        </div>
      );
    case 'textarea':
      return (
        <textarea
          className="field" value={value} placeholder={attr.placeholder || ''}
          onChange={(e) => setField(attr.key, e.target.value)}
        />
      );
    case 'text':
    default:
      return (
        <input
          className="field" type="text" value={value} placeholder={attr.placeholder || ''}
          onChange={(e) => setField(attr.key, e.target.value)}
        />
      );
  }
}
