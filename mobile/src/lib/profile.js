import { doc, getDoc } from 'firebase/firestore';
import { auth, BACKEND_URL, db } from './firebase';

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
      subscriptionActive: !!data.subscriptionActive,
      subscriptionExpiresAt: data.subscriptionExpiresAt?.toMillis ? data.subscriptionExpiresAt.toMillis() : null,
    };
  } catch {
    return { name: 'User', photo: '', phone: '', location: '', subscriptionActive: false, subscriptionExpiresAt: null };
  }
}

const PHONE_RE = /^(?:\+251|0)(7|9)\d{8}$/;

// Saves name, phone and location through the backend, same call as the web Edit Info sheet.
// Photo changes are not included yet (needs a native image picker).
export async function updateMyProfile({ fullName, phone, location }) {
  const name = (fullName || '').trim();
  const ph = (phone || '').trim();
  if (!name) throw new Error('Please enter your full name.');
  if (!PHONE_RE.test(ph)) throw new Error('Enter a valid Ethiopian number, e.g. 0912345678.');
  const user = auth.currentUser;
  if (!user) throw new Error('Please log in again.');
  const idToken = await user.getIdToken();
  const r = await fetch(`${BACKEND_URL}/updateProfile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, fullName: name, phone: ph, photoUrl: null, location: (location || '').trim() }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Couldn't save your details.");
}

// Active only while the flag is set and the expiry (if any) hasn't passed.
export function isSubscriptionActive(profile) {
  if (!profile?.subscriptionActive) return false;
  if (!profile.subscriptionExpiresAt) return true;
  return profile.subscriptionExpiresAt > Date.now();
}

export function formatExpiry(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
