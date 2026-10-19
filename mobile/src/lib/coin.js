import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, BACKEND_URL, db } from './firebase';

export function subscribeCoinBalance(uid, onChange) {
  return onSnapshot(
    doc(db, 'coins', uid),
    (snap) => onChange(snap.exists() ? snap.data().balance || 0 : 0),
    () => onChange(0),
  );
}

// Public market state (current rate etc.).
export function subscribeCoinMarket(onChange) {
  return onSnapshot(
    doc(db, 'coinMarket', 'global'),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    () => onChange(null),
  );
}

export function subscribeCoinTransactions(uid, onChange) {
  const q = query(collection(db, 'coinTransactions'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => onChange([]),
  );
}

async function callCoinEndpoint(path, body) {
  const idToken = await auth.currentUser.getIdToken();
  const r = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...body }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw Object.assign(new Error(data.error || "Couldn't complete that."), {
      insufficient: r.status === 402,
      balance: data.balance,
    });
  }
  return data;
}

export const buyCoin = (etbAmount) => callCoinEndpoint('/buyCoin', { etbAmount });
export const sellCoin = (coinAmount) => callCoinEndpoint('/sellCoin', { coinAmount });
export const transferCoin = (recipientAddress, amount) => callCoinEndpoint('/transferCoin', { recipientAddress, amount });

// Name preview for the Send form; null on any miss.
export async function resolveCoinAddress(address) {
  if (!address) return null;
  try {
    const r = await fetch(`${BACKEND_URL}/resolveCoinAddress/${encodeURIComponent(address.trim())}`);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

export function formatCoin(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}
