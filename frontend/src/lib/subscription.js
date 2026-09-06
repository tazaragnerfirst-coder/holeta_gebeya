// A subscription is active only while subscriptionActive is true AND
// (if an expiry is set) that expiry hasn't passed yet. Computed
// client-side from data the profile already carries — no separate
// "has it expired" write/cron job needed.
export function isSubscriptionActive(profile) {
  if (!profile?.subscriptionActive) return false;
  if (!profile.subscriptionExpiresAt) return true;
  return profile.subscriptionExpiresAt > Date.now();
}

export function formatExpiry(expiresAtMs) {
  if (!expiresAtMs) return '';
  return new Date(expiresAtMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
