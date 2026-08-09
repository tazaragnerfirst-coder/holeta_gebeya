import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getInitData } from './telegram';

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

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let loginPromise = null;

/**
 * Browsing (home, search, product detail) needs NO auth.
 * Call this lazily — only right before an action that requires an
 * account: contacting a seller (chat) or posting an ad.
 * Sends Telegram initData to the Render backend for HMAC
 * verification, then signs in with the returned custom token.
 *
 * NOTE: the Render free tier sleeps after inactivity — the first
 * call after a while can take 20-50s to wake up. Callers should
 * show a loading state while this resolves.
 */
export function ensureLoggedIn() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (loginPromise) return loginPromise;

  loginPromise = fetch(`${BACKEND_URL}/telegramAuth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: getInitData() }),
  })
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
