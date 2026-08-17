import { Timestamp } from 'firebase/firestore';

// How long a listing stays active after posting/renewing.
export const AD_LIFETIME_DAYS = 30;

export function computeExpiresAt() {
  return Timestamp.fromDate(new Date(Date.now() + AD_LIFETIME_DAYS * 24 * 60 * 60 * 1000));
}

// Ads posted before this feature existed have no expiresAt field —
// treat those as never-expiring rather than instantly expired.
export function isExpired(ad) {
  if (!ad.expiresAt) return false;
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms < Date.now();
}

export function isActiveAd(ad) {
  return ad.status === 'active' && !isExpired(ad);
}

// Whole days since a listing's createdAt timestamp. Used for
// per-day performance rates (views/day) on the seller dashboard.
export function daysSincePosted(ad) {
  const ms = typeof ad?.createdAt?.toMillis === 'function' ? ad.createdAt.toMillis() : null;
  if (!ms) return null;
  return Math.max(1, Math.round((Date.now() - ms) / (24 * 60 * 60 * 1000)));
}

export function isCurrentlyBoosted(ad) {
  return !!(ad?.boostedUntil && ad.boostedUntil.toDate?.() > new Date());
}
