import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { ErrorBanner } from './Banner.jsx';

// Ethiopian mobile numbers: 09XXXXXXXX / 07XXXXXXXX or +2519.../+2517...
const PHONE_RE = /^(?:\+251|0)(7|9)\d{8}$/;

export default function SignupSheet({ open, busy, error, defaultName = '', onClose, onSubmit }) {
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(defaultName);
      setPhone('');
      setTouched(false);
    }
  }, [open, defaultName]);

  if (!open) return null;

  const nameError = touched && !fullName.trim() ? 'Please enter your full name.' : '';
  const phoneError = touched && !PHONE_RE.test(phone.trim())
    ? 'Enter a valid Ethiopian number, e.g. 0912345678.'
    : '';

  function submit() {
    setTouched(true);
    if (!fullName.trim() || !PHONE_RE.test(phone.trim())) return;
    onSubmit({ fullName: fullName.trim(), phone: phone.trim() });
  }

  return (
    <div className="sheet-overlay">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>Create your account</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cancel"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <p className="helper-text" style={{ marginBottom: 16 }}>
            You need an account to message sellers, call, or post an ad. Browsing stays free — no account needed for that.
          </p>

          <div className={`field-group ${nameError ? 'has-error' : ''}`} style={{ marginBottom: 14 }}>
            <label className="field-label">Full Name<span className="req">*</span></label>
            <input
              className="field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Abebe Kebede"
            />
            {nameError && <p className="field-error">{nameError}</p>}
          </div>

          <div className={`field-group ${phoneError ? 'has-error' : ''}`}>
            <label className="field-label">Phone Number<span className="req">*</span></label>
            <input
              className="field"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXX"
            />
            {phoneError && <p className="field-error">{phoneError}</p>}
          </div>

          {error && <ErrorBanner text={error} style={{ marginTop: 14 }} />}
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
