import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Same source as frontend/src/lib/appBanner.js: config/appBanner.imageUrl
// (set in the Firebase console). No doc / no imageUrl = no banner, not an error.
export async function getAppBannerUrl() {
  try {
    const snap = await getDoc(doc(db, 'config', 'appBanner'));
    return snap.exists() ? (snap.data()?.imageUrl || null) : null;
  } catch {
    return null;
  }
}
