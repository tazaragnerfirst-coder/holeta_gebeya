import React from 'react';
import ChipSelect from './ChipSelect.jsx';
import ColorSwatchSelect from './ColorSwatchSelect.jsx';

/**
 * Renders form fields from a subcategory's `attributes` schema
 * (see src/data/categories.js). Keeps values in a flat object keyed
 * by attribute.key, passed up via onChange.
 *
 * `select` / `select-dependent` / `color` render as inline chips or
 * swatches (never a native <select> popup). `select-dependent` and
 * `color` (when given a `dependsOn`) narrow their option list to the
 * chosen parent value (e.g. brand -> model -> storage/ram/color),
 * falling back to `fallbackOptions` when the specific parent value
 * isn't in `optionsByParent`.
 */
export default function DynamicAttributeForm({ attributes, values, onChange, errors = {}, colorHexOverrides }) {
  const setField = (key, value) => onChange({ ...values, [key]: value });
  const labelFor = (key) => attributes.find((a) => a.key === key)?.label || key;

  return (
    <div className="attr-form">
      {attributes.map((attr) => {
        const error = errors[attr.key];
        return (
          <div className={`field-group ${error ? 'has-error' : ''}`} key={attr.key}>
            <label className="field-label">
              {attr.label}
              {attr.required && <span className="req">*</span>}
            </label>
            {renderInput(attr, values, setField, labelFor, colorHexOverrides)}
            {error && <p className="field-error">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}

function renderInput(attr, values, setField, labelFor, colorHexOverrides) {
  const value = values[attr.key] ?? '';

  switch (attr.type) {
    case 'select': {
      return (
        <ChipSelect
          options={attr.options || []}
          value={value}
          onChange={(v) => setField(attr.key, v)}
          otherValue={values[`${attr.key}__other`]}
          onOtherChange={(v) => setField(`${attr.key}__other`, v)}
        />
      );
    }
    case 'select-dependent': {
      const parentValue = values[attr.dependsOn];
      const options = parentValue ? ((attr.optionsByParent || {})[parentValue] || attr.fallbackOptions || []) : [];
      return (
        <ChipSelect
          options={options}
          value={value}
          onChange={(v) => setField(attr.key, v)}
          disabled={!parentValue}
          placeholder={parentValue ? `No ${attr.label.toLowerCase()} options for this ${labelFor(attr.dependsOn).toLowerCase()} yet.` : `Select ${labelFor(attr.dependsOn).toLowerCase()} first`}
          otherValue={values[`${attr.key}__other`]}
          onOtherChange={(v) => setField(`${attr.key}__other`, v)}
        />
      );
    }
    case 'color': {
      const parentValue = attr.dependsOn ? values[attr.dependsOn] : null;
      const options = attr.dependsOn
        ? (parentValue ? ((attr.optionsByParent || {})[parentValue] || attr.fallbackOptions || []) : [])
        : (attr.options || []);
      return (
        <ColorSwatchSelect
          options={options}
          value={value}
          onChange={(v) => setField(attr.key, v)}
          placeholder={attr.dependsOn && !parentValue ? `Select ${labelFor(attr.dependsOn).toLowerCase()} first` : ''}
          colorHexOverrides={colorHexOverrides}
        />
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
