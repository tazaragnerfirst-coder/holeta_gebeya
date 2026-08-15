import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, ensureLoggedIn, BACKEND_URL } from './firebase';
import { getUnsafeUserPreview } from './telegram';
import { useAppData } from './appData';
import SignupSheet from '../components/SignupSheet.jsx';

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
  const pendingRef = useRef(null);
  const { markRegistered } = useAppData();

  const requireRegistered = useCallback(async () => {
    const user = await ensureLoggedIn();
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
  }, [markRegistered]);

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
      {children}
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

export function useRequireRegistered() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useRequireRegistered must be used inside <AuthGateProvider>');
  return ctx;
}
