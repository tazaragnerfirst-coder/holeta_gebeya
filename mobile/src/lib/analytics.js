import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Seller-level daily analytics (written by the web app and the backend).
// Mirrors frontend/src/lib/analytics.js (read side only).

function cutoffString(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString().slice(0, 10);
}

// Returns one doc per day with activity, sorted ascending by date.
// `days` is a lookback window; pass Infinity for all time.
export async function getSellerAnalytics(sellerId, days = 30) {
  if (!sellerId) return [];
  const snap = await getDocs(query(collection(db, 'sellerAnalytics'), where('sellerId', '==', sellerId)));
  let rows = snap.docs.map((d) => d.data());
  if (days !== Infinity) {
    const cutoff = cutoffString(days);
    rows = rows.filter((a) => a.date >= cutoff);
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// Per-listing daily docs for a set of listing ids, keyed by listing id.
// Firestore `in` takes at most 30 values, so ids are chunked.
export async function getListingAnalyticsBulk(listingIds, sellerId, days = 7) {
  const ids = (listingIds || []).filter(Boolean);
  if (ids.length === 0 || !sellerId) return {};
  const cutoff = days === Infinity ? null : cutoffString(days);

  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

  const byListing = {};
  await Promise.all(chunks.map(async (chunk) => {
    const snap = await getDocs(query(
      collection(db, 'listingAnalytics'),
      where('sellerId', '==', sellerId),
      where('listingId', 'in', chunk),
    ));
    snap.docs.forEach((d) => {
      const data = d.data();
      if (cutoff && data.date < cutoff) return;
      (byListing[data.listingId] ||= []).push(data);
    });
  }));
  return byListing;
}
