import {
  addDoc, collection, doc, getDocs, increment, limit, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { auth, BACKEND_URL, db } from './firebase';

// Ports of the web helpers used by ProductDetail.jsx
// (frontend/src/lib/analytics.js, subscription.js, format.js).

// Native has no "register" gate: the app only runs signed in.
export function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Please log in to continue.');
  return user;
}

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

export function conditionTone(condition) {
  if (!condition) return 'default';
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c.includes('repair')) return 'repair';
  return 'used';
}

// A listing's own seller-subscription snapshot (expiry is a millis number).
export function isSellerVerified(listing) {
  if (!listing?.sellerSubscriptionActive) return false;
  const exp = listing.sellerSubscriptionExpiresAt;
  if (!exp) return true;
  return exp > Date.now();
}

// --- analytics writes (same docs/fields as frontend/src/lib/analytics.js) ---
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const SELLER_ANALYTICS_FIELDS = ['views', 'contacts', 'storeVisits'];

async function bump(sellerId, field) {
  if (!sellerId) return;
  const date = todayStr();
  const updates = {};
  SELLER_ANALYTICS_FIELDS.forEach((f) => { updates[f] = increment(f === field ? 1 : 0); });
  try {
    await setDoc(doc(db, 'sellerAnalytics', `${sellerId}_${date}`), { sellerId, date, ...updates }, { merge: true });
  } catch {
    // Best-effort, same as web.
  }
}

async function bumpListing(sellerId, listingId, field) {
  if (!sellerId || !listingId) return;
  const date = todayStr();
  const other = field === 'views' ? 'contacts' : 'views';
  try {
    await setDoc(doc(db, 'listingAnalytics', `${listingId}_${date}`), {
      listingId,
      sellerId,
      date,
      [field]: increment(1),
      [other]: increment(0),
    }, { merge: true });
  } catch {
    // Best-effort, same as web.
  }
}

export function logListingView(sellerId, listingId) {
  return Promise.all([bump(sellerId, 'views'), bumpListing(sellerId, listingId, 'views')]);
}

export function logContactClick(sellerId, listingId) {
  return Promise.all([bump(sellerId, 'contacts'), bumpListing(sellerId, listingId, 'contacts')]);
}

// Public, low-stakes counter on the listing itself.
export function bumpListingViews(listingId) {
  return updateDoc(doc(db, 'listings', listingId), { views: increment(1) }).catch(() => {});
}

// "You might also like": same category, limit 12, newest first, top 6, excluding this one.
export async function fetchSimilar(item) {
  const snap = await getDocs(query(collection(db, 'listings'), where('category', '==', item.category), limit(12)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((l) => l.id !== item.id)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 6);
}

// Call flow step 1: the backend only hands out the number to a verified user.
export async function requestSellerPhone(sellerId) {
  const user = requireUser();
  const idToken = await user.getIdToken();
  const r = await fetch(`${BACKEND_URL}/getSellerPhone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, sellerId }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Couldn't get the seller's number.");
  return data.phone;
}

export function notifyAdmin({ text }) {
  return fetch(`${BACKEND_URL}/notifyAdmin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch(() => {});
}

export async function submitListingReport(item, { reason, note }) {
  const user = requireUser();
  await addDoc(collection(db, 'reports'), {
    listingId: item.id,
    reporterId: user.uid,
    reason,
    note,
    createdAt: serverTimestamp(),
  });
  notifyAdmin({ text: `🚩 New report: "${item.title}"\nReason: ${reason}${note ? `\nNote: ${note}` : ''}` });
}
