import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
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

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

let loginPromise = null;

/**
 * Browsing (home, search, product detail) needs NO auth.
 * Call this lazily — only right before an action that requires an
 * account: contacting a seller (chat) or posting an ad.
 * Verifies Telegram initData server-side and exchanges it for a
 * Firebase custom auth token.
 */
export function ensureLoggedIn() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (loginPromise) return loginPromise;

  const telegramAuth = httpsCallable(functions, 'telegramAuth');
  loginPromise = telegramAuth({ initData: getInitData() })
    .then((res) => signInWithCustomToken(auth, res.data.token))
    .then((cred) => cred.user)
    .finally(() => { loginPromise = null; });

  return loginPromise;
}
