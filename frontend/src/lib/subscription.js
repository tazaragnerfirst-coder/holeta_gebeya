// A subscription is active only while the flag is true AND (if an
// expiry is set) that expiry hasn't passed yet. Computed client-side
// from data already on hand — no separate "has it expired" write/cron
// job needed. Shared by the profile check (SubscriptionStatus.jsx,
// MyStore.jsx) and the per-listing snapshot check (#hog023/#hog048
// Verified badge — ListingCard/ProductDetail).
export function isActiveByExpiry(activeFlag, expiresAtMs) {
  if (!activeFlag) return false;
  if (!expiresAtMs) return true;
  return expiresAtMs > Date.now();
}

export function isSubscriptionActive(profile) {
  return isActiveByExpiry(profile?.subscriptionActive, profile?.subscriptionExpiresAt);
}

// A listing's own denormalized seller-subscription snapshot (set at
// post time, refreshed by the admin panel on approval) — same shape,
// different field names since it lives on a listing doc not a profile.
export function isSellerVerified(listing) {
  return isActiveByExpiry(listing?.sellerSubscriptionActive, listing?.sellerSubscriptionExpiresAt);
}

export function formatExpiry(expiresAtMs) {
  if (!expiresAtMs) return '';
  return new Date(expiresAtMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
