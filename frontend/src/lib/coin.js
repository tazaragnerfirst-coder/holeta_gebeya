import { collection, doc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth, ensureLoggedIn, BACKEND_URL } from './firebase';

// Holeta Coin (#hog070). Same shape as lib/wallet.js's pattern —
// balance/ledger are read-only live Firestore listeners; every
// balance-changing action goes through a backend endpoint (Admin SDK)
// so it can't be spoofed client-side.

export function subscribeCoinBalance(uid, onChange) {
  return onSnapshot(doc(db, 'coins', uid), (snap) => {
    onChange(snap.exists() ? (snap.data().balance || 0) : 0);
  }, () => onChange(0));
}

// Global rate/demand/supply state — public, not scoped to a uid.
export function subscribeCoinMarket(onChange) {
  return onSnapshot(doc(db, 'coinMarket', 'global'), (snap) => {
    onChange(snap.exists() ? snap.data() : null);
  }, () => onChange(null));
}

// Recent rate points (one per trade) for the trade chart.
export function subscribeCoinRateHistory(onChange, points = 60) {
  const q = query(collection(db, 'coinRateHistory'), orderBy('createdAt', 'desc'), limit(points));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
    onChange(rows);
  }, () => onChange([]));
}

export function subscribeCoinTransactions(uid, onChange) {
  const q = query(collection(db, 'coinTransactions'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => onChange([]));
}

async function callCoinEndpoint(path, body) {
  await ensureLoggedIn();
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

export function buyCoin(etbAmount) {
  return callCoinEndpoint('/buyCoin', { etbAmount });
}

export function sellCoin(coinAmount) {
  return callCoinEndpoint('/sellCoin', { coinAmount });
}

export function transferCoin(recipientAddress, amount) {
  return callCoinEndpoint('/transferCoin', { recipientAddress, amount });
}

// Coin-funded Subscription/Boost — mirrors lib/wallet.js's spendWallet().
export function spendCoin({ type, listingId } = {}) {
  return callCoinEndpoint('/spendCoin', { type, listingId });
}

// Best-effort address→name preview for the Send form, before the
// sender commits to a transfer. Returns null on any miss/error.
export async function resolveCoinAddress(address) {
  if (!address) return null;
  try {
    const r = await fetch(`${BACKEND_URL}/resolveCoinAddress/${encodeURIComponent(address.trim())}`);
    if (!r.ok) return null;
    return r.json(); // { firstName }
  } catch {
    return null;
  }
}
