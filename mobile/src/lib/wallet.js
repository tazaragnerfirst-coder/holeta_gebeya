import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, BACKEND_URL, db } from './firebase';

// Live wallet balance (only the admin panel / backend ever write it).
export function subscribeWalletBalance(uid, onChange) {
  return onSnapshot(
    doc(db, 'wallets', uid),
    (snap) => onChange(snap.exists() ? snap.data().balance || 0 : 0),
    () => onChange(0),
  );
}

// Recent top-ups and purchases, newest first.
export function subscribeWalletTransactions(uid, onChange) {
  const q = query(collection(db, 'walletTransactions'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => onChange([]),
  );
}

// A top-up still waiting for admin review, or null.
export async function getPendingWalletTopup(uid) {
  const snap = await getDocs(query(
    collection(db, 'walletTopups'),
    where('uid', '==', uid),
    where('status', '==', 'pending'),
    limit(1),
  ));
  return snap.empty ? null : snap.docs[0].data();
}

// Pays for a subscription or a boost (pass listingId) from the wallet.
// The backend verifies the balance; `.insufficient` is true when it is too low.
export async function spendWallet({ type, listingId } = {}) {
  const idToken = await auth.currentUser.getIdToken();
  const r = await fetch(`${BACKEND_URL}/spendWallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, type, listingId }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw Object.assign(new Error(data.error || "Couldn't complete the purchase."), {
      insufficient: r.status === 402,
      balance: data.balance,
    });
  }
  return data;
}
