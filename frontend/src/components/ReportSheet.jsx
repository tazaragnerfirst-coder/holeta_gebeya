import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const REASONS = ['Prohibited item', 'Looks like a scam', 'Wrong category', 'Offensive content', 'Other'];

export default function ReportSheet({ open, busy, error, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;

  function submit() {
    setTouched(true);
    if (!reason) return;
    onSubmit({ reason, note: note.trim() });
  }

  return (
    <div className="sheet-overlay">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>Report this listing</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cancel"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <div className="field-group">
            <label className="field-label">Reason<span className="req">*</span></label>
            <div className="chip-row" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
              {REASONS.map((r) => (
                <span
                  key={r}
                  className={`chip ${reason === r ? 'active' : ''}`}
                  onClick={() => setReason(r)}
                >{r}</span>
              ))}
            </div>
            {touched && !reason && <p className="field-error">Please choose a reason.</p>}
          </div>

          <div className="field-group" style={{ marginTop: 14 }}>
            <label className="field-label">Additional details (optional)</label>
            <textarea
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else we should know?"
            />
          </div>

          {error && (
            <div className="error-banner" style={{ marginTop: 14 }}>
              <Icon name="x" size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
