import React, { useState } from 'react';
import Icon from './Icon.jsx';

export default function CallSheet({ open, phone, sellerName, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  function copy() {
    navigator.clipboard?.writeText(phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>{sellerName || 'Seller'}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <div className="call-number">{phone}</div>
          <div className="call-actions">
            <a href={`tel:${phone}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Icon name="phone" size={16} /> Call now
            </a>
            <button type="button" className="btn btn-outline-primary" onClick={copy}>
              {copied ? 'Copied!' : 'Copy number'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
