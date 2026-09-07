import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureLoggedIn } from './firebase';

// Deliberately its own collection, not a field on users/{uid} —
// that doc holds the seller's phone number and is admin-only
// writable (firestore.rules), so it can never be opened up for
// public read. storeProfiles/{uid} holds only what's safe to show
// any buyer, and the owner writes it directly, no backend endpoint
// needed (unlike name/phone/photo, which go through /updateProfile).
export async function getStoreProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'storeProfiles', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveStoreProfile(uid, { bio, address, socialLinks }) {
  await ensureLoggedIn();
  await setDoc(doc(db, 'storeProfiles', uid), {
    bio: bio || '',
    address: address || '',
    socialLinks: {
      tiktok: socialLinks?.tiktok || '',
      instagram: socialLinks?.instagram || '',
      whatsapp: socialLinks?.whatsapp || '',
      website: socialLinks?.website || '',
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
