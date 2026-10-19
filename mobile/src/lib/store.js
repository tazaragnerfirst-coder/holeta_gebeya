import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Public store details a seller chose to show (bio, address, social links), or null.
export async function getStoreProfile(uid) {
  const snap = await getDoc(doc(db, 'storeProfiles', uid));
  return snap.exists() ? snap.data() : null;
}

// Average of all reviews on this seller's listings.
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
