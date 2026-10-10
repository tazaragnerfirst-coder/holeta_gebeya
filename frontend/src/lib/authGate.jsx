import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, ensureLoggedIn, setBrowserLoginHandler, BACKEND_URL } from './firebase';
import { getUnsafeUserPreview } from './telegram';
import { useAppData } from './appData';
import SignupSheet from '../components/SignupSheet.jsx';
import ConnectingIndicator from '../components/ConnectingIndicator.jsx';
import BrowserLoginSheet from '../components/BrowserLoginSheet.jsx';
import { isInTelegram } from './platform';

const AuthGateContext = createContext(null);

/**
 * Wraps the app. Provides `requireRegistered()` — the single gate
 * every account-required action (post, chat, call, dashboard) should
 * call instead of `ensureLoggedIn()` directly.
 *
 * Flow: sign in via Telegram (silent, existing behavior) -> check
 * users/{uid} for a saved phone number -> if missing, show the
 * signup sheet and wait for the person to submit full name + phone
 * before resolving. Browsing never calls this, so it never triggers.
 */
export function AuthGateProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const pendingRef = useRef(null);
  const [loginReq, setLoginReq] = useState(null); // { resolve, reject } while the browser login sheet is open

  // Browser/app login (no Telegram initData) — see BrowserLoginSheet.
  useEffect(() => {
    setBrowserLoginHandler(() => new Promise((resolve, reject) => setLoginReq({ resolve, reject })));
    return () => setBrowserLoginHandler(null);
  }, []);
  const { registeredUid, markRegistered } = useAppData();

  // Standalone app (installed PWA / APK): nothing is shown until the
  // person has logged in through Telegram. Inside the Telegram Mini App
  // this is skipped entirely — Telegram signs them in silently.
  const standalone = !isInTelegram();
  const [sessionChecked, setSessionChecked] = useState(!standalone);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!standalone) return undefined;
    // Fires once Firebase has restored any saved session (offline too),
    // then again on every sign-in / sign-out.
    return auth.onAuthStateChanged((user) => {
      setSignedIn(Boolean(user));
      setSessionChecked(true);
    });
  }, [standalone]);
  const gateLocked = standalone && (!sessionChecked || !signedIn);

  const requireRegistered = useCallback(async () => {
    setConnecting(true);
    let user;
    try {
      user = await ensureLoggedIn();
    } finally {
      setConnecting(false);
    }
    if (registeredUid && registeredUid === user.uid) return user;

    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists() && snap.data().phone) {
      markRegistered(user.uid);
      return user;
    }

    return new Promise((resolve, reject) => {
      pendingRef.current = { resolve, reject, user };
      setError('');
      setOpen(true);
    });
  }, [registeredUid, markRegistered]);

  async function handleSubmit({ fullName, phone }) {
    setBusy(true);
    setError('');
    try {
      const idToken = await auth.currentUser.getIdToken();
      const r = await fetch(`${BACKEND_URL}/completeProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, fullName, phone }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Couldn't save your details (${r.status}).`);
      setOpen(false);
      markRegistered(pendingRef.current.user.uid);
      pendingRef.current?.resolve(pendingRef.current.user);
      pendingRef.current = null;
    } catch (err) {
      setError(err.message || "Couldn't save your details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setOpen(false);
    pendingRef.current?.reject(new Error('An account is required to continue.'));
    pendingRef.current = null;
  }

  const preview = getUnsafeUserPreview();
  const defaultName = [preview?.first_name, preview?.last_name].filter(Boolean).join(' ');

  return (
    <AuthGateContext.Provider value={requireRegistered}>
      {gateLocked
        ? (sessionChecked ? <LoginWall onLogin={() => ensureLoggedIn().catch(() => {})} /> : null)
        : children}
      <ConnectingIndicator active={connecting && !loginReq} />
      <BrowserLoginSheet
        open={!!loginReq}
        onToken={(token) => { loginReq?.resolve(token); setLoginReq(null); }}
        onCancel={() => { loginReq?.reject(new Error('Login cancelled.')); setLoginReq(null); }}
      />
      <SignupSheet
        open={open}
        busy={busy}
        error={error}
        defaultName={defaultName}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </AuthGateContext.Provider>
  );
}

// Full-screen login for the standalone app. The actual Telegram code
// flow is BrowserLoginSheet, which opens on top of this when the button
// is tapped (ensureLoggedIn -> browserLoginHandler). Once Firebase signs
// the person in, onAuthStateChanged unlocks the app.
function LoginWall({ onLogin }) {
  return (
    <div className="login-wall">
      <span className="splash-wordmark">Holeta Gebeya</span>
      <p className="login-wall-text">Log in with your Telegram account to continue.</p>
      <button type="button" className="btn-primary login-wall-btn" onClick={onLogin}>
        Log in with Telegram
      </button>
    </div>
  );
}

export function useRequireRegistered() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useRequireRegistered must be used inside <AuthGateProvider>');
  return ctx;
}
