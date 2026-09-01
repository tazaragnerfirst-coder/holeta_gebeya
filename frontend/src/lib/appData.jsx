import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUnsafeUserPreview } from './telegram';
import { getCached, setCached } from './pageCache';
import { subscribeFavorites } from './favorites';
import { isActiveAd } from './adStatus';
import { getSellerRating } from './rating';

const AppDataContext = createContext(null);

const REG_KEY = 'hg_registered:';

// Small first page so the feed paints fast even on a slow
// connection, instead of waiting on a bigger batch to arrive all at
// once — loadMoreListings() below fetches further pages the same
// size as the person scrolls (or as search/filter needs more to
// search through — see Home.jsx's prefetch-ahead sentinel).
const LISTINGS_PAGE_SIZE = 12;

function expectedUid() {
  const tgUser = getUnsafeUserPreview();
  return tgUser ? `tg_${tgUser.id}` : null;
}

// A past session already confirmed this uid has a phone on file.
// Trust that optimistically so chats/ads can start warming up the
// instant the app opens, instead of every cold start waiting on a
// fresh auth-restore + Firestore round trip first. The real check in
// the effect below still runs in the background and corrects this
// (clears it) if anything's actually changed.
function knownRegisteredUid() {
  const uid = expectedUid();
  if (!uid) return null;
  try {
    return localStorage.getItem(REG_KEY + uid) === '1' ? uid : null;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for the data pages need, fetched once here
 * at the app root and kept alive for the whole session — instead of
 * every page opening its own Firestore listener on mount. This is
 * the fix for "each page has its own loading": there is now exactly
 * ONE place that decides when/how this data loads, so any future
 * loading tweak happens here once, not inside every page.
 *
 * PROJECT CONVENTION: any new page/feature that loads its own data
 * from Firestore should be wired in here (or, if it's page-scoped
 * and parameterized in a way that doesn't fit a shared context value
 * — e.g. a date-range picker — should at least seed its initial
 * state from pageCache.js's getCached()/setCached() the same way
 * this file does) rather than doing a bare one-off fetch in a
 * useEffect. Two profile/rating fields and Dashboard's analytics
 * were originally built as page-local fetches with no cache, which
 * is exactly the "reloads fresh + goes blank offline" gap this
 * pattern exists to avoid — don't reintroduce that gap in new code.
 *
 * - Home listings: public, starts the moment the app opens.
 * - Chats / Dashboard ads: need a registered account (phone on
 *   file). They start warming up in the background the moment we
 *   know the user is registered — either silently, because this
 *   device already had a saved session from a previous visit (no
 *   prompt, no network sign-in call — just reading what Firebase
 *   already restored locally), or because they just finished
 *   signup this session via requireRegistered(). Once started they
 *   never stop, so every later visit to Chat/Dashboard is instant.
 */
export function AppDataProvider({ children }) {
  // Category/subcategory/attribute-schema definitions (see #hog001 in
  // memory) — public like listings, so it loads the moment the app
  // opens with no registration needed. Kept live (not a one-off
  // fetch) so an admin edit shows up without the person reloading.
  const [categories, setCategories] = useState(() => getCached('categories') || []);
  const [categoriesReady, setCategoriesReady] = useState(() => getCached('categories') != null);

  const [listings, setListings] = useState(() => getCached('listings') || []);
  const [listingsReady, setListingsReady] = useState(() => getCached('listings') != null);
  // Server-side search/filter results (#hog002) — over the FULL
  // listings collection, not just whatever pages have been scrolled
  // into above. Home.jsx swaps to rendering these while search/
  // category/price/condition filtering is active.
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // Whether a further (older) page of listings exists to fetch, and
  // whether one is in flight right now — both read by Home.jsx's
  // scroll sentinel to decide when to call loadMoreListings().
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  // The last doc of whichever page most recently loaded (live page 1
  // or a fetched-once later page) — Firestore's own cursor for
  // "continue after this point", not re-derived from `listings`
  // state so it stays correct even after de-duping merges below.
  const lastListingDocRef = useRef(null);

  const initialUid = knownRegisteredUid();
  const [registeredUid, setRegisteredUid] = useState(initialUid);
  const [chats, setChats] = useState(() => (initialUid ? getCached(`chats:${initialUid}`) || [] : []));
  const [chatsReady, setChatsReady] = useState(() => (initialUid ? getCached(`chats:${initialUid}`) != null : false));
  const [ads, setAds] = useState(() => (initialUid ? getCached(`ads:${initialUid}`) || [] : []));
  const [adsReady, setAdsReady] = useState(() => (initialUid ? getCached(`ads:${initialUid}`) != null : false));
  const [favorites, setFavorites] = useState(() => (initialUid ? getCached(`favorites:${initialUid}`) || [] : []));
  const [favoritesReady, setFavoritesReady] = useState(() => (initialUid ? getCached(`favorites:${initialUid}`) != null : false));
  const [profile, setProfile] = useState(() => (initialUid ? getCached(`profile:${initialUid}`) || null : null));
  const [profileReady, setProfileReady] = useState(() => (initialUid ? getCached(`profile:${initialUid}`) != null : false));
  const [sellerRating, setSellerRating] = useState(() => (initialUid ? getCached(`sellerRating:${initialUid}`) || { avg: 0, count: 0 } : { avg: 0, count: 0 }));
  const [sellerRatingReady, setSellerRatingReady] = useState(() => (initialUid ? getCached(`sellerRating:${initialUid}`) != null : false));

  const checkedSession = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(data);
      setCategoriesReady(true);
      setCached('categories', data);
    }, () => setCategoriesReady(true));
    return unsub;
  }, []);

  useEffect(() => {
    // Only the first page stays real-time — a brand new post should
    // appear at the top instantly. Older pages (fetched by
    // loadMoreListings below) are one-off reads: keeping a live
    // listener open per page would mean as many Firestore listeners
    // as pages scrolled, for no real benefit (nobody needs a stranger's
    // 3-page-deep old listing to update live).
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(LISTINGS_PAGE_SIZE));
    const unsub = onSnapshot(q, (snap) => {
      // Paused (and expired) listings stay in Firestore for the
      // seller to manage, but shouldn't show up in the public feed.
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd);
      // This listener re-fires on ANY change to the top 12 (e.g. a
      // new listing anywhere posts), so it can't just replace
      // `listings` wholesale — that would wipe out further pages
      // loadMoreListings already appended, and reorder/shuffle cards
      // the person has already scrolled past. Instead: refresh
      // already-rendered items in place (position untouched) and
      // append any brand-new id to the end, so new arrivals land at
      // the bottom of what's already showing instead of disturbing it.
      setListings((prev) => {
        const prevIds = new Set(prev.map((l) => l.id));
        const byId = new Map(data.map((l) => [l.id, l]));
        const merged = prev.map((item) => byId.get(item.id) || item);
        for (const item of data) {
          if (!prevIds.has(item.id)) merged.push(item);
        }
        setCached('listings', merged);
        return merged;
      });
      setListingsReady(true);
      lastListingDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMoreListings(snap.docs.length === LISTINGS_PAGE_SIZE);
    }, () => setListingsReady(true));
    return unsub;
  }, []);

  // Fetches the next page (after whichever doc was loaded last) and
  // appends it — called by Home.jsx's scroll sentinel before the
  // person actually reaches the bottom, so the next batch is usually
  // already there by the time they scroll that far. De-dupes by id
  // since the live first page can occasionally overlap with a
  // just-fetched later page (e.g. a listing's rank shifted between
  // the two reads) — safe to call repeatedly; a call already in
  // flight, or no further page, is a no-op.
  async function loadMoreListings() {
    if (loadingMoreListings || !hasMoreListings || !lastListingDocRef.current) return;
    setLoadingMoreListings(true);
    try {
      const q = query(
        collection(db, 'listings'),
        orderBy('createdAt', 'desc'),
        startAfter(lastListingDocRef.current),
        limit(LISTINGS_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const newDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd);
      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        const merged = [...prev, ...newDocs.filter((l) => !seen.has(l.id))];
        setCached('listings', merged);
        return merged;
      });
      lastListingDocRef.current = snap.docs[snap.docs.length - 1] || lastListingDocRef.current;
      setHasMoreListings(snap.docs.length === LISTINGS_PAGE_SIZE);
    } catch {
      // Best-effort — leave hasMoreListings as-is so the sentinel
      // just tries again next time it comes into view.
    } finally {
      setLoadingMoreListings(false);
    }
  }

  // Background re-verification of the optimistic localStorage flag
  // above. Doesn't gate the UI — by the time this resolves, chats/ads
  // are usually already showing last-known data. Only corrects things
  // (signs the account out of the trusted state) if it turns out the
  // phone-on-file check no longer holds.
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (checkedSession.current || !user) return;
      checkedSession.current = true;
      const uid = expectedUid();
      if (uid && user.uid !== uid) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().phone) {
          markRegistered(user.uid);
        } else if (registeredUid === user.uid) {
          try { localStorage.removeItem(REG_KEY + user.uid); } catch {}
          setRegisteredUid(null);
        }
      } catch {
        // Stay silent — page-level requireRegistered() flows still work normally.
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called by the signup flow the instant a user completes
  // registration this session, so Chat/Dashboard start warming up
  // right away instead of waiting for a future app reload — and
  // persisted so the NEXT app open skips the wait entirely too.
  function markRegistered(uid) {
    setRegisteredUid((prev) => prev || uid);
    try { localStorage.setItem(REG_KEY + uid, '1'); } catch {}
  }

  // Called on logout — drops the trusted-session flag so the next
  // action (browsing itself needs nothing) re-runs the full
  // requireRegistered() flow instead of silently reusing this
  // device's last known account.
  function clearRegistered(uid) {
    try { localStorage.removeItem(REG_KEY + uid); } catch {}
    setRegisteredUid(null);
    setChats([]); setChatsReady(false);
    setAds([]); setAdsReady(false);
    setFavorites([]); setFavoritesReady(false);
    setProfile(null); setProfileReady(false);
    setSellerRating({ avg: 0, count: 0 }); setSellerRatingReady(false);
  }

  useEffect(() => {
    if (!registeredUid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', registeredUid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChats(data);
      setChatsReady(true);
      setCached(`chats:${registeredUid}`, data);
    }, () => setChatsReady(true));
    return unsub;
  }, [registeredUid]);

  useEffect(() => {
    if (!registeredUid) return;
    const q = query(collection(db, 'listings'), where('sellerId', '==', registeredUid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAds(data);
      setAdsReady(true);
      setCached(`ads:${registeredUid}`, data);
    }, () => setAdsReady(true));
    return unsub;
  }, [registeredUid]);

  useEffect(() => {
    if (!registeredUid) return;
    const unsub = subscribeFavorites(registeredUid, (data) => {
      setFavorites(data);
      setFavoritesReady(true);
      setCached(`favorites:${registeredUid}`, data);
    });
    return unsub;
  }, [registeredUid]);

  // Own users/{uid} doc — name, photo, phone, location, subscription
  // status. Live (not a one-off fetch) so a save from EditProfileSheet
  // (via /updateProfile on the backend) reflects here automatically,
  // no manual refetch needed.
  useEffect(() => {
    if (!registeredUid) { setProfile(null); setProfileReady(false); return; }
    const preview = getUnsafeUserPreview();
    const fallbackName = preview?.first_name || '';
    const fallbackPhoto = preview?.photo_url || '';
    const unsub = onSnapshot(doc(db, 'users', registeredUid), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const p = {
        name: data.fullName || fallbackName || 'User',
        // customPhotoUrl (uploaded via Edit Profile) takes priority
        // over photoUrl (Telegram's own picture, re-synced on every
        // login) so a custom photo sticks even after the next sign-in.
        photo: data.customPhotoUrl || data.photoUrl || fallbackPhoto || '',
        phone: data.phone || '',
        location: data.location || '',
        subscriptionActive: !!data.subscriptionActive,
      };
      setProfile(p);
      setProfileReady(true);
      setCached(`profile:${registeredUid}`, p);
    }, () => setProfileReady(true));
    return unsub;
  }, [registeredUid]);

  // Seller-level aggregate rating. getSellerRating() already caches
  // (and falls back to its own cache on failure) — this just seeds
  // the initial render from that same cache too, and keeps it
  // re-fetched whenever the registered account changes.
  useEffect(() => {
    if (!registeredUid) { setSellerRating({ avg: 0, count: 0 }); setSellerRatingReady(false); return; }
    let cancelled = false;
    getSellerRating(registeredUid).then((r) => {
      if (cancelled) return;
      setSellerRating(r);
      setSellerRatingReady(true);
    });
    return () => { cancelled = true; };
  }, [registeredUid]);

  // Server-side search/filter (#hog002). `term`'s last (still-being-
  // typed) word drives a Firestore `array-contains` on searchTokens
  // — the typed string is itself one of the stored prefixes, so it
  // matches directly with no debounce needed server-side. Earlier,
  // already-typed words, plus price range and condition, are refined
  // client-side over the (already narrowed by category/that one
  // token) candidate set below — cheap at that point, and avoids
  // needing a separate composite index for every filter combination.
  async function searchListings({ term = '', categoryId = null, categoryType = null, minPrice = null, maxPrice = null, conditions = [] } = {}) {
    setSearchLoading(true);
    try {
      const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const liveWord = words[words.length - 1] || null;
      const completedWords = words.slice(0, -1);

      let q = query(collection(db, 'listings'));
      if (categoryType) q = query(q, where('categoryType', '==', categoryType));
      else if (categoryId) q = query(q, where('category', '==', categoryId));
      if (liveWord) q = query(q, where('searchTokens', 'array-contains', liveWord));
      q = query(q, orderBy('createdAt', 'desc'), limit(200));

      const snap = await getDocs(q);
      let results = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd);

      if (minPrice != null) results = results.filter((l) => l.price != null && l.price >= minPrice);
      if (maxPrice != null) results = results.filter((l) => l.price != null && l.price <= maxPrice);
      if (conditions.length > 0) results = results.filter((l) => conditions.includes(l.condition));
      if (completedWords.length > 0) {
        results = results.filter((l) => {
          const hay = (l.title || '').toLowerCase();
          return completedWords.every((w) => hay.includes(w));
        });
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <AppDataContext.Provider value={{
      categories, categoriesReady,
      listings, listingsReady,
      searchResults, searchLoading, searchListings,
      hasMoreListings, loadingMoreListings, loadMoreListings,
      registeredUid, markRegistered, clearRegistered,
      chats, chatsReady,
      ads, adsReady,
      favorites, favoritesReady,
      profile, profileReady,
      sellerRating, sellerRatingReady,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
