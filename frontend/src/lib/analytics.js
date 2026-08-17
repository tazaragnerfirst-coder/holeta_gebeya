import { doc, setDoc, getDocs, collection, query, where, increment } from 'firebase/firestore';
import { db } from './firebase';

// One doc per seller per calendar day (UTC), id `${sellerId}_${date}`.
// Kept deliberately simple — a handful of docs per seller, no
// composite index needed, same public/low-stakes write pattern as
// the existing `views` counter on listings.
function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function docId(sellerId, date) {
  return `${sellerId}_${date}`;
}

// Always write both fields (one incremented by 1, the other by 0) so
// the doc's shape is identical whether this is the first event of
// the day or the hundredth — keeps the security rule simple.
async function bump(sellerId, field) {
  if (!sellerId) return;
  const date = todayStr();
  const other = field === 'views' ? 'contacts' : 'views';
  try {
    await setDoc(doc(db, 'sellerAnalytics', docId(sellerId, date)), {
      sellerId,
      date,
      [field]: increment(1),
      [other]: increment(0),
    }, { merge: true });
  } catch {
    // Best-effort — a missed analytics event should never block the buyer's action.
  }
}

export function logListingView(sellerId) {
  return bump(sellerId, 'views');
}

export function logContactClick(sellerId) {
  return bump(sellerId, 'contacts');
}

// Fetches every daily doc for this seller and filters/sorts
// client-side — cheap since one seller has at most one doc per day.
// `days` is a lookback window; pass Infinity for all-time.
export async function getSellerAnalytics(sellerId, days = 30) {
  if (!sellerId) return [];
  const snap = await getDocs(query(collection(db, 'sellerAnalytics'), where('sellerId', '==', sellerId)));
  const all = snap.docs.map((d) => d.data());
  let filtered = all;
  if (days !== Infinity) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    filtered = all.filter((a) => a.date >= cutoffStr);
  }
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}
