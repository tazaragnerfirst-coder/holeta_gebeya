import { collection, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

function favDoc(uid, listingId) {
  return doc(db, 'users', uid, 'favorites', listingId);
}

// Adds/removes a listing from the signed-in user's saved list. The
// listing's own title/price/photo are snapshotted onto the favorite
// doc at save time, so the Favorites page can render instantly
// without a second round-trip per item — same pattern as how chat
// threads carry listing context.
export async function setFavorite(uid, listing, isFavorited) {
  const ref = favDoc(uid, listing.id);
  if (isFavorited) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      listingId: listing.id,
      title: listing.title || '',
      price: listing.price || '',
      photo: (listing.images && listing.images[0]) || '',
      location: listing.location || '',
      condition: listing.condition || '',
      createdAt: serverTimestamp(),
    });
  }
}

// Live-subscribes to the user's favorites, newest-saved first.
// Returns an unsubscribe function.
export function subscribeFavorites(uid, onChange) {
  const q = query(collection(db, 'users', uid, 'favorites'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => onChange([]));
}
