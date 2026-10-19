import { Timestamp, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

// Same lifetime as the web app (frontend/src/lib/adStatus.js).
const AD_LIFETIME_DAYS = 300;

// Renew an expired ad: active again with a fresh expiry date.
export function renewAd(id) {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + AD_LIFETIME_DAYS * 24 * 60 * 60 * 1000));
  return updateDoc(doc(db, 'listings', id), { status: 'active', expiresAt });
}

export function isExpiredAd(ad) {
  if (!ad.expiresAt) return false;
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms < Date.now();
}

// Live list of the signed-in seller's own listings (any status).
export function subscribeMyAds(uid, onData, onError) {
  const q = query(collection(db, 'listings'), where('sellerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      onData(data);
    },
    (err) => onError && onError(err),
  );
}

export function setAdStatus(id, status) {
  return updateDoc(doc(db, 'listings', id), { status });
}

export function deleteAd(id) {
  return deleteDoc(doc(db, 'listings', id));
}

// Same rule as the web app (adStatus.js): active and not expired.
export function isLiveAd(ad) {
  if (ad.status !== 'active') return false;
  if (!ad.expiresAt) return true;
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms >= Date.now();
}
