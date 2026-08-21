import { auth } from './firebase';

// On a fresh app load, appData.jsx trusts a cached "registered" flag
// from localStorage and starts pages (Dashboard, etc.) immediately —
// but Firebase Auth's own persisted-session restore is still async
// at that point, so `auth.currentUser` can briefly be null. A
// Firestore onSnapshot listener tolerates that fine (it waits for
// credentials and resumes), but a one-shot getDocs() call fired
// during that gap goes out unauthenticated and gets permission-
// denied, with no automatic retry. This lets a one-shot read wait
// for that restore instead of racing it. Falls back to resolving
// anyway after `timeoutMs` so a genuine auth problem still surfaces
// as an error rather than hanging forever.
export function waitForAuthReady(timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (auth.currentUser) { resolve(auth.currentUser); return; }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user || settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}
