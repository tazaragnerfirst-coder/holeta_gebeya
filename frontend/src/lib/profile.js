import { doc, getDoc } from 'firebase/firestore';
import { db, ensureLoggedIn } from './firebase';
import { getUnsafeUserPreview } from './telegram';

// Reads the caller's OWN users/{uid} doc (allowed by firestore.rules
// — a user can only read their own profile) and returns the verified
// display name + avatar to use anywhere their identity is shown to
// someone else (chat header, chat list, listing "posted by"). Falls
// back to the unsafe Telegram preview only if the profile read fails
// or a field hasn't been backfilled yet on an older account.
export async function getMyProfile(uid) {
  const preview = getUnsafeUserPreview();
  const fallbackName = preview?.first_name || '';
  const fallbackPhoto = preview?.photo_url || '';
  try {
    await ensureLoggedIn();
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.exists() ? snap.data() : {};
    return {
      name: data.fullName || fallbackName || 'User',
      // customPhotoUrl (uploaded via Edit Profile) takes priority
      // over photoUrl (Telegram's own picture, re-synced on every
      // login) so a custom photo sticks even after the next sign-in.
      photo: data.customPhotoUrl || data.photoUrl || fallbackPhoto || '',
      phone: data.phone || '',
      location: data.location || '',
      subscriptionActive: !!data.subscriptionActive,
    };
  } catch {
    return { name: fallbackName || 'User', photo: fallbackPhoto, phone: '', location: '', subscriptionActive: false };
  }
}
