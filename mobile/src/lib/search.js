import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Mirrors frontend/src/lib/appData.jsx searchListings(): server-side
// prefix search on `searchTokens`, then price/condition/title filters
// applied on the client.

export const ALL_CHIP_ID = '__all__';
export const JOB_CHIP_ID = '__job__';
export const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'];

const RECENT_KEY = 'hg_recent_searches';
const MAX_RECENT = 6;

function isActive(ad) {
  if (ad.status !== 'active') return false;
  if (!ad.expiresAt) return true;
  const ms = typeof ad.expiresAt.toMillis === 'function' ? ad.expiresAt.toMillis() : ad.expiresAt;
  return ms >= Date.now();
}

// Live list of categories, in admin order.
export function subscribeCategories(onData, onError) {
  const q = query(collection(db, 'categories'), orderBy('order'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err),
  );
}

export async function searchListings({ term = '', categoryId = null, categoryType = null, minPrice = null, maxPrice = null, conditions = [] } = {}) {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const liveWord = words[words.length - 1] || null;
  const completedWords = words.slice(0, -1);

  let q = query(collection(db, 'listings'));
  if (categoryType) q = query(q, where('categoryType', '==', categoryType));
  else if (categoryId) q = query(q, where('category', '==', categoryId));
  if (liveWord) q = query(q, where('searchTokens', 'array-contains', liveWord));
  q = query(q, orderBy('createdAt', 'desc'), limit(200));

  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActive);

  if (minPrice != null) results = results.filter((l) => l.price != null && l.price >= minPrice);
  if (maxPrice != null) results = results.filter((l) => l.price != null && l.price <= maxPrice);
  if (conditions.length > 0) results = results.filter((l) => conditions.includes(l.condition));
  if (completedWords.length > 0) {
    results = results.filter((l) => {
      const hay = (l.title || '').toLowerCase();
      return completedWords.every((w) => hay.includes(w));
    });
  }
  return results;
}

export async function getRecentSearches() {
  try {
    return JSON.parse((await AsyncStorage.getItem(RECENT_KEY)) || '[]');
  } catch {
    return [];
  }
}

export async function pushRecentSearch(term) {
  const t = term.trim();
  if (!t) return getRecentSearches();
  const prev = await getRecentSearches();
  const list = [t, ...prev.filter((s) => s.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
  return list;
}

export async function clearRecentSearches() {
  await AsyncStorage.removeItem(RECENT_KEY);
}
