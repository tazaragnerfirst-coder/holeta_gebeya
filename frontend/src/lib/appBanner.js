import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCached, setCached } from './pageCache';

// Admin sets/rotates config/appBanner.imageUrl directly in the
// Firebase console (no admin panel yet) — e.g. swapping in a New
// Year or holiday image for the Profile page hero. No doc / no
// imageUrl just means "no banner right now", not an error.
const CACHE_KEY = 'appBanner';

export async function getAppBannerUrl() {
  try {
    const snap = await getDoc(doc(db, 'config', 'appBanner'));
    const url = snap.exists() ? (snap.data()?.imageUrl || null) : null;
    setCached(CACHE_KEY, url);
    return url;
  } catch {
    return getCached(CACHE_KEY) || null;
  }
}

export function getCachedAppBannerUrl() {
  return getCached(CACHE_KEY) || null;
}
