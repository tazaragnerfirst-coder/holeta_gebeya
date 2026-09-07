import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { ErrorBanner } from './Banner.jsx';

export default function EditStoreSheet({ open, busy, error, initialBio = '', initialAddress = '', initialSocial = {}, onClose, onSubmit }) {
  const [bio, setBio] = useState(initialBio);
  const [address, setAddress] = useState(initialAddress);
  const [tiktok, setTiktok] = useState(initialSocial.tiktok || '');
  const [instagram, setInstagram] = useState(initialSocial.instagram || '');
  const [whatsapp, setWhatsapp] = useState(initialSocial.whatsapp || '');
  const [website, setWebsite] = useState(initialSocial.website || '');

  useEffect(() => {
    if (open) {
      setBio(initialBio);
      setAddress(initialAddress);
      setTiktok(initialSocial.tiktok || '');
      setInstagram(initialSocial.instagram || '');
      setWhatsapp(initialSocial.whatsapp || '');
      setWebsite(initialSocial.website || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function submit() {
    onSubmit({
      bio: bio.trim(),
      address: address.trim(),
      socialLinks: { tiktok: tiktok.trim(), instagram: instagram.trim(), whatsapp: whatsapp.trim(), website: website.trim() },
    });
  }

  return (
    <div className="sheet-overlay">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>Edit Store</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cancel"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          <div className="field-group" style={{ marginBottom: 14 }}>
            <label className="field-label">About your store <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>(optional)</span></label>
            <textarea
              className="field"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell buyers what you sell..."
            />
          </div>

          <div className="field-group" style={{ marginBottom: 14 }}>
            <label className="field-label">Address <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>(optional)</span></label>
            <input
              className="field"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Holeta, near the main market"
            />
          </div>

          <div className="section-title" style={{ marginTop: 4 }}>Links (optional)</div>

          <div className="field-group" style={{ marginBottom: 10 }}>
            <label className="field-label"><Icon name="tiktok" size={13} /> TikTok</label>
            <input className="field" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="Profile link or @username" />
          </div>
          <div className="field-group" style={{ marginBottom: 10 }}>
            <label className="field-label"><Icon name="instagram" size={13} /> Instagram</label>
            <input className="field" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Profile link or @username" />
          </div>
          <div className="field-group" style={{ marginBottom: 10 }}>
            <label className="field-label"><Icon name="whatsapp" size={13} /> WhatsApp</label>
            <input className="field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="09XXXXXXXX or chat link" />
          </div>
          <div className="field-group">
            <label className="field-label"><Icon name="globe" size={13} /> Website</label>
            <input className="field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>

          {error && <ErrorBanner text={error} style={{ marginTop: 14 }} />}
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
