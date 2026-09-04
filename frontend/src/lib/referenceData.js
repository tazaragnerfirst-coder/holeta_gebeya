import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCached, setCached } from './pageCache';
import { sortNatural } from '../data/categories';

// Backs `categories` attributes that point at a `refCollection`
// instead of embedding their options inline (see #hog001 in memory)
// — e.g. phone brand -> model -> storage/RAM/color. Data is fetched
// lazily and only for what's actually needed, not all at once:
//   - the brand-name list lives in one small referenceData/{refId} doc
//   - each brand's full model list lives in its own small
//     referenceData/{refId}/brands/{brandId} doc, fetched only once
//     the person has picked that brand
// Both are cached via pageCache the same way the rest of the app
// caches Firestore reads, so re-picking a brand within the cache TTL
// is instant and works offline from last-known data.

export function brandIdFor(brandName) {
  return String(brandName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function getBrandList(refId) {
  const cacheKey = `refData:${refId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, 'referenceData', refId));
    const brands = snap.exists() ? sortNatural(snap.data().brands || []) : [];
    setCached(cacheKey, brands);
    return brands;
  } catch {
    return [];
  }
}

// Returns { models: [{ model, storage, ram, color }, ...] } for one
// brand, or an empty list if it fails/doesn't exist — callers treat
// a missing brand doc the same as "no options yet", not an error.
// Models and each model's storage/RAM/color lists are all sorted
// (#hog018) — none of these have an admin-intended order, unlike a
// `select` attribute's typed options.
export async function getBrandModels(refId, brandName) {
  const brandId = brandIdFor(brandName);
  const cacheKey = `refData:${refId}:${brandId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, 'referenceData', refId, 'brands', brandId));
    const rawModels = snap.exists() ? (snap.data().models || []) : [];
    const models = sortNatural(rawModels, (m) => m.model).map((m) => ({
      ...m,
      storage: sortNatural(m.storage || []),
      ram: sortNatural(m.ram || []),
      color: sortNatural(m.color || []),
    }));
    setCached(cacheKey, models);
    return models;
  } catch {
    return [];
  }
}
