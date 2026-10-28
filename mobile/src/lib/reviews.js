import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { BACKEND_URL, db } from './firebase';
import { getMyProfile } from './profile';
import { requireUser } from './listingActions';

// This listing's own reviews, newest first (same query as web ProductDetail).
export async function fetchListingReviews(listingId) {
  const snap = await getDocs(query(collection(db, 'reviews'), where('listingId', '==', listingId), limit(20)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

// Seller-level rating = average of every review on any of their listings.
export async function getSellerRating(sellerId) {
  try {
    const snap = await getDocs(query(collection(db, 'reviews'), where('sellerId', '==', sellerId)));
    const ratings = snap.docs.map((d) => d.data().rating).filter((r) => typeof r === 'number');
    return ratings.length
      ? { avg: ratings.reduce((s, r) => s + r, 0) / ratings.length, count: ratings.length }
      : { avg: 0, count: 0 };
  } catch {
    return { avg: 0, count: 0 };
  }
}

// Writes reviews/{listingId}_{uid} (same fields as web), then fires the
// best-effort /syncSellerRating refresh. Resolves with the refreshed list.
export async function saveReview(item, { rating, comment }) {
  const user = requireUser();
  // Web uses the Telegram first name; native uses the first word of the profile name.
  const profile = await getMyProfile(user.uid);
  const buyerName = (profile.name && profile.name !== 'User' ? profile.name.split(' ')[0] : '') || 'Buyer';
  await setDoc(doc(db, 'reviews', `${item.id}_${user.uid}`), {
    listingId: item.id,
    sellerId: item.sellerId,
    buyerId: user.uid,
    buyerName,
    rating,
    comment,
    createdAt: serverTimestamp(),
  }, { merge: true });
  const reviews = await fetchListingReviews(item.id);
  try {
    user.getIdToken().then((idToken) => fetch(`${BACKEND_URL}/syncSellerRating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, sellerId: item.sellerId }),
    }).catch(() => {})).catch(() => {});
  } catch {}
  return reviews;
}
