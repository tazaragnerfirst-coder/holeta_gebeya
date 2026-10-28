import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Mirrors frontend/src/lib/homeBanners.js: config/homeBanners.banners
// ([{ id, imageUrl, linkUrl }]). No doc / empty array = no banners, not an error.
// Module-level cache stands in for the web pageCache.
let cached = [];

export async function getHomeBanners() {
  try {
    const snap = await getDoc(doc(db, 'config', 'homeBanners'));
    const banners = snap.exists() ? (snap.data()?.banners || []) : [];
    cached = banners;
    return banners;
  } catch {
    return cached;
  }
}

export function getCachedHomeBanners() {
  return cached;
}
