import { collection, documentId, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

export const LISTINGS_PAGE_SIZE = 30;

// Same rule as the web app (frontend/src/lib/adStatus.js): only active
// listings that have not expired appear in the public feed. Paused and
// expired listings stay in Firestore for the seller to manage.
function isActiveAd(ad) {
  if (ad.status !== 'active') return false;
  if (!ad.expiresAt) return true; // ads from before expiry existed never expire
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms >= Date.now();
}

// Live listener for the public feed. Calls `onData` with the active
// listings and `onError` if the listener itself fails.
export function subscribeListings(onData, onError) {
  const q = query(collection(db, 'listings'), orderBy(documentId()), limit(LISTINGS_PAGE_SIZE));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd)),
    (err) => onError && onError(err),
  );
}

// Same display rules as the web app's formatListingPrice().
export function formatListingPrice(item) {
  const type = item.priceType || 'fixed';
  if (type === 'free') return 'Free';
  if (type === 'contact') return 'Contact seller';
  const amount = Number(item.price);
  const formatted = Number.isFinite(amount) ? amount.toLocaleString('en-US') : String(item.price ?? '');
  if (type === 'negotiable') return item.price != null ? `${formatted} (negotiable)` : 'Negotiable';
  return formatted;
}
