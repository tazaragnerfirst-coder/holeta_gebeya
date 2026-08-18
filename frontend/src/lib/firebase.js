import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getInitData, getUnsafeUserPreview } from './telegram';

// Fill these in from Firebase Console → Project Settings → General.
// Safe to keep in the client bundle (these are public identifiers,
// not secrets — access is controlled by firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyB3fzsBS9m5dqrk20wHig35lPxxnKny5mE',
  authDomain: 'holeta-c22fc.firebaseapp.com',
  projectId: 'holeta-c22fc',
  storageBucket: 'holeta-c22fc.firebasestorage.app',
  messagingSenderId: '747642466720',
  appId: '1:747642466720:web:0be7ee1e33e7d1668774c5',
  measurementId: 'G-THX2TJHHR3',
};

// URL of the small Express server deployed on Render — see
// backend/server/index.js. Set VITE_BACKEND_URL in a .env file
// (frontend/.env) or in Vite's build-time env vars.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
export { BACKEND_URL };

export const app = initializeApp(firebaseConfig);

// Plain in-memory Firestore client — deliberately NOT using
// persistentLocalCache (IndexedDB). Telegram Mini Apps tear down and
// recreate the WebView on every open; that teardown mid-transaction
// is what was corrupting Firestore's IndexedDB persistence layer and
// causing the recurring "FIRESTORE INTERNAL ASSERTION FAILED:
// Unexpected state" crash on posting/loading. Fast first-paint (the
// original reason persistence was added) is already handled by our
// own localStorage cache in lib/pageCache.js, so dropping Firestore's
// own persistence loses nothing and removes the crash at its root.
export const db = getFirestore(app);

export const auth = getAuth(app);

let loginPromise = null;

// Backend mints uids as `tg_<telegram id>` (see server/index.js
// telegramAuth handler) — mirror that here so we can tell whether a
// cached Firebase session actually belongs to the Telegram user
// currently using this device.
function expectedUidForCurrentTelegramUser() {
  const tgUser = getUnsafeUserPreview();
  return tgUser ? `tg_${tgUser.id}` : null;
}

/**
 * Browsing (home, search, product detail) needs NO auth.
 * Call this lazily — only right before an action that requires an
 * account: contacting a seller (chat) or posting an ad.
 * Sends Telegram initData to the Render backend for HMAC
 * verification, then signs in with the returned custom token.
 *
 * IMPORTANT: Firebase Auth persists sessions in IndexedDB across page
 * reloads. If a different Telegram user opens this Mini App on the
 * same device/browser storage (shared device, testing, etc.) without
 * this check, they would silently inherit the PREVIOUS person's
 * signed-in identity — seeing and sending messages as them. So we
 * always confirm the cached session's uid still matches the current
 * Telegram user before reusing it, and force a fresh sign-in
 * (via signOut) if it doesn't.
 *
 * NOTE: the Render free tier sleeps after inactivity — the first
 * call after a while can take 20-50s to wake up. Callers should
 * show a loading state while this resolves.
 */
export function ensureLoggedIn() {
  const expectedUid = expectedUidForCurrentTelegramUser();

  if (auth.currentUser && (!expectedUid || auth.currentUser.uid === expectedUid)) {
    return Promise.resolve(auth.currentUser);
  }

  if (loginPromise) return loginPromise;

  const mismatchedSession = auth.currentUser && expectedUid && auth.currentUser.uid !== expectedUid;
  if (mismatchedSession) {
    console.warn('Cached Firebase session belongs to a different Telegram user — signing out before re-authenticating.');
  }

  loginPromise = (mismatchedSession ? signOut(auth) : Promise.resolve())
    .then(() => fetch(`${BACKEND_URL}/telegramAuth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData() }),
    }))
    .then((r) => {
      if (!r.ok) return r.json().then((e) => { throw new Error(e.error || `Login failed (${r.status})`); });
      return r.json();
    })
    .then((data) => signInWithCustomToken(auth, data.token))
    .then((cred) => cred.user)
    .catch((err) => {
      console.error('ensureLoggedIn failed:', err);
      throw err;
    })
    .finally(() => { loginPromise = null; });

  return loginPromise;
}

// Best-effort — never blocks or breaks message sending if it fails
// (e.g. Render free-tier cold start). Fire-and-forget from callers.
export function notifyNewMessage({ recipientUid, senderName, listingTitle, text, chatId }) {
  return fetch(`${BACKEND_URL}/notifyNewMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientUid, senderName, listingTitle, text, chatId }),
  }).catch((err) => console.error('notifyNewMessage failed:', err));
}
