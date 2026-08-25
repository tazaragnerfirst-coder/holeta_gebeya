import { doc, setDoc, getDocs, collection, query, where, increment } from 'firebase/firestore';
import { db, ensureLoggedIn } from './firebase';

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

// Same pattern as `bump`, but keyed by listing instead of seller —
// powers the per-ad sparkline/trend on the Views detail page.
async function bumpListing(sellerId, listingId, field) {
  if (!sellerId || !listingId) return;
  const date = todayStr();
  const other = field === 'views' ? 'contacts' : 'views';
  try {
    await setDoc(doc(db, 'listingAnalytics', docId(listingId, date)), {
      listingId,
      sellerId,
      date,
      [field]: increment(1),
      [other]: increment(0),
    }, { merge: true });
  } catch {
    // Best-effort — same as above.
  }
}

// listingId is optional so existing call sites keep working; pass it
// wherever the listing is known so that ad gets its own trend data.
export function logListingView(sellerId, listingId) {
  return Promise.all([bump(sellerId, 'views'), bumpListing(sellerId, listingId, 'views')]);
}

export function logContactClick(sellerId, listingId) {
  return Promise.all([bump(sellerId, 'contacts'), bumpListing(sellerId, listingId, 'contacts')]);
}

// Fetches every daily doc for this seller and filters/sorts
// client-side — cheap since one seller has at most one doc per day.
// `days` is a lookback window; pass Infinity for all-time.
export async function getSellerAnalytics(sellerId, days = 30) {
  if (!sellerId) return [];
  await ensureLoggedIn();
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

// Fetches daily docs for one listing (used by the per-ad detail page).
// `sellerId` isn't used to look anything up — it's included purely
// so this is a *provably* rule-safe query: Firestore validates a
// list query's security rule against the query's own `where`
// clauses, not each document's actual data, so a query that only
// filters by listingId can't be proven to satisfy a rule that checks
// sellerId and gets rejected outright, even though every matching
// doc actually does belong to this seller.
export async function getListingAnalytics(listingId, sellerId, days = 30) {
  if (!listingId || !sellerId) return [];
  await ensureLoggedIn();
  const snap = await getDocs(query(
    collection(db, 'listingAnalytics'),
    where('listingId', '==', listingId),
    where('sellerId', '==', sellerId),
  ));
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

// Bulk fetch for a list of listing ids (the Views list page — one
// query instead of one per ad). Firestore 'in' caps at 30 values, so
// this chunks; a seller with 30+ ads is an edge case worth the extra
// round trip rather than a reason to complicate this further.
//
// sellerId is required: the listingAnalytics security rule is
// `resource.data.sellerId == request.auth.uid`, and Firestore can
// only prove a *list* query satisfies that rule if the query itself
// filters on the same field — a query with only `listingId in [...]`
// and no matching `sellerId ==` gets rejected outright with
// permission-denied, even when every listing really does belong to
// the caller. All current callers already scope `ads` to the signed-
// in seller, so this is just making that same constraint explicit
// in the query.
export async function getListingAnalyticsBulk(listingIds, sellerId, days = 7) {
  const ids = (listingIds || []).filter(Boolean);
  if (ids.length === 0 || !sellerId) return {};
  await ensureLoggedIn();
  const cutoffStr = days === Infinity ? null : (() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString().slice(0, 10);
  })();

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
      if (cutoffStr && data.date < cutoffStr) return;
      (byListing[data.listingId] ||= []).push(data);
    });
  }));
  Object.values(byListing).forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)));
  return byListing;
}
