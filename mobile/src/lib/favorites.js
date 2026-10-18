import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

function favDoc(uid, listingId) {
  return doc(db, 'users', uid, 'favorites', listingId);
}

// Adds or removes a listing from the user's saved list (same fields as the web app).
export async function setFavorite(uid, listing, isFavorited) {
  const ref = favDoc(uid, listing.id);
  if (isFavorited) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      listingId: listing.id,
      title: listing.title || '',
      price: listing.price ?? null,
      priceType: listing.priceType || 'fixed',
      photo: (listing.images && listing.images[0]) || '',
      location: listing.location || '',
      condition: listing.condition || '',
      createdAt: serverTimestamp(),
    });
  }
}

// Live list of saved listings, newest first.
export function subscribeFavorites(uid, onChange) {
  const q = query(collection(db, 'users', uid, 'favorites'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => onChange([]),
  );
}
