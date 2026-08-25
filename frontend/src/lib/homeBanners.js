import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCached, setCached } from './pageCache';

// Admin sets/reorders config/homeBanners.banners directly in the
// Firebase console (no admin panel yet — same pattern as appBanner.js).
// Shape: { banners: [{ id, imageUrl, linkUrl }, ...] }
// - imageUrl: required, the banner image
// - linkUrl: optional; starts with "/" for an in-app route (e.g.
//   "/dashboard/ads") or "http(s)://" for an external link opened via
//   Telegram's WebApp.openLink. No linkUrl means the banner just
//   isn't tappable.
// No doc / empty array just means "no banners right now", not an error.
const CACHE_KEY = 'homeBanners';

export async function getHomeBanners() {
  try {
    const snap = await getDoc(doc(db, 'config', 'homeBanners'));
    const banners = snap.exists() ? (snap.data()?.banners || []) : [];
    setCached(CACHE_KEY, banners);
    return banners;
  } catch {
    return getCached(CACHE_KEY) || [];
  }
}

export function getCachedHomeBanners() {
  return getCached(CACHE_KEY) || [];
}
