import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { ErrorBanner } from './Banner.jsx';
import { BACKEND_URL } from '../lib/firebase';

// Login for the installed app / browser (anywhere that is NOT the Telegram
// Mini App). Telegram is still the identity: the person opens the bot,
// confirms the same 4-digit code shown here, and we get a token for their
// existing `tg_<id>` account. See /authStart, /authPoll in the backend.
const POLL_MS = 2000;

export default function BrowserLoginSheet({ open, onToken, onCancel }) {
  const [state, setState] = useState({ status: 'starting', nonce: '', code: '', botLink: '', error: '' });
  const [attempt, setAttempt] = useState(0);
  const cbRef = useRef({ onToken });
  cbRef.current = { onToken };

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let timer = null;
    setState({ status: 'starting', nonce: '', code: '', botLink: '', error: '' });

    async function post(path, body) {
      const r = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
      return data;
    }

    async function poll(nonce) {
      if (cancelled) return;
      try {
        const data = await post('/authPoll', { nonce });
        if (cancelled) return;
        if (data.status === 'ok') { cbRef.current.onToken(data.token); return; }
        if (data.status === 'expired') {
          setState((s) => ({ ...s, status: 'expired' }));
          return;
        }
      } catch {
        // transient network error — keep polling
      }
      timer = setTimeout(() => poll(nonce), POLL_MS);
    }

    post('/authStart', {})
      .then((d) => {
        if (cancelled) return;
        setState({ status: 'waiting', nonce: d.nonce, code: d.code, botLink: d.botLink, error: '' });
        poll(d.nonce);
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, status: 'error', error: err.message || "Couldn't start login." }));
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, attempt]);

  if (!open) return null;
  const { status, code, botLink, error } = state;

  return (
    <div className="sheet-overlay">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3>Log in with Telegram</h3>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Cancel"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body">
          {status === 'starting' && <p className="helper-text">Preparing your login… (first time can take up to 30s)</p>}

          {status === 'waiting' && (
            <>
              <p className="helper-text" style={{ marginBottom: 14 }}>
                1. Tap the button and press <b>Start</b> in Telegram.<br />
                2. Check the code there matches this one, then tap <b>Confirm login</b>.<br />
                3. Come back here — you'll be logged in automatically.
              </p>
              <div className="login-code" aria-label={`Login code ${code}`}>{code}</div>
              <p className="helper-text" style={{ textAlign: 'center', marginTop: 10 }}>Waiting for confirmation…</p>
            </>
          )}

          {status === 'expired' && <ErrorBanner text="This login expired. Tap Try again to get a new one." />}
          {status === 'error' && <ErrorBanner text={error} />}
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
          {status === 'waiting' && (
            <a className="btn-primary login-open" href={botLink} target="_blank" rel="noopener noreferrer">Open Telegram</a>
          )}
          {(status === 'expired' || status === 'error') && (
            <button type="button" className="btn-primary" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
          )}
        </div>
      </div>
    </div>
  );
}
