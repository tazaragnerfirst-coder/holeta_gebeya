import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { fileToCompressedBase64 } from '../lib/imageCompress';

const PHONE_RE = /^(?:\+251|0)(7|9)\d{8}$/;

export default function EditProfileSheet({ open, busy, error, initialName = '', initialPhone = '', initialPhoto = '', onClose, onSubmit }) {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [photoPreview, setPhotoPreview] = useState(initialPhoto);
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFullName(initialName);
      setPhone(initialPhone);
      setPhotoPreview(initialPhoto);
      setNewPhotoDataUrl(null);
      setTouched(false);
    }
  }, [open, initialName, initialPhone, initialPhoto]);

  if (!open) return null;

  const nameError = touched && !fullName.trim() ? 'Please enter your full name.' : '';
  const phoneError = touched && !PHONE_RE.test(phone.trim())
    ? 'Enter a valid Ethiopian number, e.g. 0912345678.'
    : '';

  async function pickPhoto(file) {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToCompressedBase64(file, { maxDim: 320, maxBytes: 60000 });
      setNewPhotoDataUrl(dataUrl);
      setPhotoPreview(dataUrl);
    } catch {
      // Leave the existing photo in place if compression fails.
    } finally {
      setPhotoBusy(false);
    }
  }

  function submit() {
    setTouched(true);
    if (!fullName.trim() || !PHONE_RE.test(phone.trim())) return;
    onSubmit({ fullName: fullName.trim(), phone: phone.trim(), photoUrl: newPhotoDataUrl });
  }

  const initial = fullName ? fullName.trim()[0]?.toUpperCase() : '?';

  return (
    <div className="sheet-overlay">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>Edit Profile</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cancel"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div
              className="avatar-lg"
              style={photoPreview ? { backgroundImage: `url(${photoPreview})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', cursor: 'pointer' } : { position: 'relative', cursor: 'pointer' }}
              onClick={() => !photoBusy && inputRef.current?.click()}
            >
              {!photoPreview && initial}
              <span style={{
                position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--surface)',
              }}>
                {photoBusy ? <span className="spinner" /> : <Icon name="camera" size={13} />}
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }}
            />
          </div>

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

          {error && (
            <div className="error-banner" style={{ marginTop: 14 }}>
              <Icon name="x" size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy || photoBusy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
