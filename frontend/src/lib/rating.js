import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { getCached, setCached } from './pageCache';

// Seller-level rating = average of every review left on any of this
// seller's listings (each review doc already carries sellerId).
// ProductDetail's per-listing average is separate and still only
// covers reviews for that one listing — unifying the two is a later
// cleanup, not part of this.
export async function getSellerRating(sellerId) {
  const cacheKey = `sellerRating:${sellerId}`;
  try {
    const snap = await getDocs(query(collection(db, 'reviews'), where('sellerId', '==', sellerId)));
    const ratings = snap.docs.map((d) => d.data().rating).filter((r) => typeof r === 'number');
    const result = ratings.length
      ? { avg: ratings.reduce((s, r) => s + r, 0) / ratings.length, count: ratings.length }
      : { avg: 0, count: 0 };
    setCached(cacheKey, result);
    return result;
  } catch {
    return getCached(cacheKey) || { avg: 0, count: 0 };
  }
}
