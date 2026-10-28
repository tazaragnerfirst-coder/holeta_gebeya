import {
  collection, documentId, getDocs, limit, onSnapshot, orderBy, query, startAfter,
} from 'firebase/firestore';
import { db } from './firebase';

// Same as frontend/src/lib/appData.jsx LISTINGS_PAGE_SIZE.
export const LISTINGS_PAGE_SIZE = 12;

// Same rule as the web app (frontend/src/lib/adStatus.js): only active
// listings that have not expired appear in the public feed. Paused and
// expired listings stay in Firestore for the seller to manage.
export function isActiveAd(ad) {
  if (ad.status !== 'active') return false;
  if (!ad.expiresAt) return true; // ads from before expiry existed never expire
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms >= Date.now();
}

// Live listener for the FIRST page of the public feed (documentId order,
// same as the web app). Calls `onData(activeListings, { lastDoc, hasMore })`
// and `onError` if the listener itself fails.
export function subscribeListings(onData, onError) {
  const q = query(collection(db, 'listings'), orderBy(documentId()), limit(LISTINGS_PAGE_SIZE));
  return onSnapshot(
    q,
    (snap) => onData(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd),
      { lastDoc: snap.docs[snap.docs.length - 1] || null, hasMore: snap.docs.length === LISTINGS_PAGE_SIZE },
    ),
    (err) => onError && onError(err),
  );
}

// Next page after `lastDoc` (one-off read, same query as web loadMoreListings).
export async function fetchMoreListings(lastDoc) {
  const q = query(
    collection(db, 'listings'),
    orderBy(documentId()),
    startAfter(lastDoc),
    limit(LISTINGS_PAGE_SIZE),
  );
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd),
    lastDoc: snap.docs[snap.docs.length - 1] || lastDoc,
    hasMore: snap.docs.length === LISTINGS_PAGE_SIZE,
  };
}

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return n.toLocaleString('en-US');
}

// Same as web formatListingPrice(): { text, currency } — `currency` says
// whether to append the small "ETB" suffix.
export function formatPriceParts(item) {
  const type = item.priceType || 'fixed';
  if (type === 'free') return { text: 'Free', currency: false };
  if (type === 'contact') return { text: 'Contact seller', currency: false };
  if (type === 'negotiable') {
    return item.price != null
      ? { text: `${formatPrice(item.price)} (negotiable)`, currency: true }
      : { text: 'Negotiable', currency: false };
  }
  return { text: String(formatPrice(item.price) ?? ''), currency: true };
}

// Plain-string form (no ETB suffix) kept for screens that already use it.
export function formatListingPrice(item) {
  return formatPriceParts(item).text;
}

// Same as the web ListingCard timeAgo().
export function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const min = Math.floor((Date.now() - ts.toDate().getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
