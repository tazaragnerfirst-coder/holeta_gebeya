import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export default function ReviewSheet({ open, busy, error, initial, onClose, onSubmit }) {
  const [rating, setRating] = useState(initial?.rating || 5);
  const [comment, setComment] = useState(initial?.comment || '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(initial?.rating || 5);
      setComment(initial?.comment || '');
      setTouched(false);
    }
  }, [open, initial]);

  if (!open) return null;

  function submit() {
    setTouched(true);
    if (!rating || !comment.trim()) return;
    onSubmit({ rating, comment: comment.trim() });
  }

  return (
    <div className="sheet-overlay">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>Rate this seller</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cancel"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <div className="star-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Icon name="star" size={30} className={n <= rating ? 'filled' : ''} />
              </button>
            ))}
          </div>

          <div className="field-group" style={{ marginTop: 16 }}>
            <label className="field-label">Comment<span className="req">*</span></label>
            <textarea
              className="field"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your experience with this seller?"
            />
          </div>

          {touched && !rating && <p className="field-error">Please pick a star rating.</p>}
          {touched && rating && !comment.trim() && <p className="field-error">Please add a short comment.</p>}
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
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
}
