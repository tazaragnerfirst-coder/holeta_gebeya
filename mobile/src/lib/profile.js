import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Reads the signed-in user's OWN users/{uid} doc (allowed by firestore.rules).
export async function getMyProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.exists() ? snap.data() : {};
    return {
      name: data.fullName || 'User',
      // Same priority as the web app: custom upload first, then Telegram photo.
      photo: data.customPhotoUrl || data.photoUrl || '',
      phone: data.phone || '',
      location: data.location || '',
    };
  } catch {
    return { name: 'User', photo: '', phone: '', location: '' };
  }
}
