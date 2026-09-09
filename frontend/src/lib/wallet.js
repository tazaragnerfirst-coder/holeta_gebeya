import { collection, doc, addDoc, query, where, getDocs, limit, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, ensureLoggedIn, BACKEND_URL } from './firebase';

// Manual receipt-review top-up (same model as the old
// subscriptionPayments/equb_bot approach): the client only ever
// creates a 'pending' doc here — crediting wallets/{uid}.balance is
// done exclusively by the admin panel (isAdmin() in firestore.rules),
// never the client.
export async function submitWalletTopup(uid, { name, phone, amount, paymentMethod, receiptImage }) {
  await ensureLoggedIn();
  await addDoc(collection(db, 'walletTopups'), {
    uid,
    name: name || '',
    phone: phone || '',
    amount,
    paymentMethod,
    receiptImage,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

// So the Wallet page can show "under review" instead of the top-up
// form again if one is already awaiting review.
export async function getPendingWalletTopup(uid) {
  await ensureLoggedIn();
  const snap = await getDocs(query(
    collection(db, 'walletTopups'),
    where('uid', '==', uid),
    where('status', '==', 'pending'),
    limit(1),
  ));
  return snap.empty ? null : snap.docs[0].data();
}

// Live balance. wallets/{uid} is only ever credited by the admin
// panel (topup approval) or debited by the /spendWallet backend
// endpoint below — never written by the client directly — so this is
// read-only here.
export function subscribeWalletBalance(uid, onChange) {
  return onSnapshot(doc(db, 'wallets', uid), (snap) => {
    onChange(snap.exists() ? (snap.data().balance || 0) : 0);
  }, () => onChange(0));
}

// Recent transaction history (topup credits, subscription/boost
// debits) for the Wallet page's ledger view.
export function subscribeWalletTransactions(uid, onChange) {
  const q = query(collection(db, 'walletTransactions'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => onChange([]));
}

// Spends from the wallet to instantly activate a subscription, or
// boost a specific ad (pass listingId). Server-verified via Admin SDK
// so the balance check and price can't be spoofed client-side — see
// backend/server/index.js's /spendWallet. Throws with `.insufficient`
// true when the balance is too low, so callers can offer a top-up.
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
  return data; // { ok, balance }
}
