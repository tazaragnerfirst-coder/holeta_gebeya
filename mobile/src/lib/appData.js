import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'react-native';
import { fetchMoreListings, subscribeListings } from './listings';
import { subscribeCategories } from './search';
import { subscribeChats } from './chat';
import { subscribeMyAds } from './ads';
import { subscribeFavorites } from './favorites';
import { subscribeMyProfile } from './profile';
import { getSellerRating } from './store';
import { subscribeWalletBalance, subscribeWalletTransactions } from './wallet';
import { subscribeCoinBalance, subscribeCoinMarket, subscribeCoinTransactions } from './coin';
import { clearUserCache, getCached, getLastUid, setCached, setLastUid } from './pageCache';

// Mirrors frontend/src/lib/appData.jsx: ONE place that loads the data the
// screens need, started when the app opens and kept alive for the whole
// session, instead of every screen opening its own Firestore listener on
// mount (which is why each tab used to show its own loader).
//
// PROJECT CONVENTION (same as the bot): any new screen that needs Firestore
// data should read it from useAppData() — add a slice here if it isn't
// covered — or, if it is parameterized per screen (e.g. a date range), seed
// its first render from pageCache's getCached()/setCached().
//
// Values are `null` until the first data (cached or live) arrives, so a
// screen's existing "null = still loading" check keeps working. After a
// cold start the last-known data comes from the disk cache on the very first
// frame, and the live listener then refreshes it in the background.
//
// - Public (start immediately): Home listings + categories, Coin rate.
// - Signed-in (start as soon as the login is known): chats, my ads,
//   favorites, profile, wallet, coin, seller rating.

const AppDataContext = createContext(null);

// Only the head of the feed is kept on disk — enough for an instant Home.
const FEED_CACHE_LIMIT = 48;
// Thumbnails warmed into the image cache as soon as the feed is known.
const IMAGE_PREFETCH_COUNT = 16;

// One signed-in slice: seeded from the cache, then kept live. `uid` is
// undefined while the saved login is still being checked (keep showing the
// cached data), null when logged out (clear), or the account id.
function useUserLive(name, uid, subscribe) {
  const [value, setValue] = useState(() => {
    const last = getLastUid();
    const cached = last ? getCached(`${name}:${last}`) : undefined;
    return cached === undefined ? null : cached;
  });
  const [error, setError] = useState(false);

  useEffect(() => {
    if (uid === null) { setValue(null); setError(false); return undefined; }
    if (!uid) return undefined;
    const key = `${name}:${uid}`;
    const cached = getCached(key);
    setValue(cached === undefined ? null : cached);
    setError(false);
    return subscribe(
      uid,
      (data) => { setValue(data); setError(false); setCached(key, data); },
      () => setError(true),
    );
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return [value, error];
}

export function AppDataProvider({ uid, children }) {
  // ---- Home feed (public) ----
  const [listings, setListings] = useState(() => getCached('listings') ?? null);
  const [listingsError, setListingsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const lastDocRef = useRef(null);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const hasMoreRef = useRef(true);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeListings((items, page) => {
      // The live first page fires again on any change, so it can't replace
      // `listings` wholesale (that would drop later pages and reorder cards
      // already on screen): refresh known items in place, append new ids.
      setListings((prev) => {
        if (!prev) return items;
        const byId = new Map(prev.map((l) => [l.id, l]));
        for (const it of items) byId.set(it.id, it);
        return Array.from(byId.values());
      });
      if (page) {
        lastDocRef.current = page.lastDoc;
        hasMoreRef.current = page.hasMore;
        setHasMoreListings(page.hasMore);
      }
      setListingsError(false);
    }, () => setListingsError(true));
    return unsub;
  }, [reloadKey]);

  useEffect(() => {
    if (listings) setCached('listings', listings.slice(0, FEED_CACHE_LIMIT));
  }, [listings]);

  async function loadMoreListings() {
    if (loadingMoreRef.current || !hasMoreRef.current || !lastDocRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMoreListings(true);
    try {
      const page = await fetchMoreListings(lastDocRef.current);
      lastDocRef.current = page.lastDoc;
      hasMoreRef.current = page.hasMore;
      setHasMoreListings(page.hasMore);
      setListings((prev) => {
        const byId = new Map((prev || []).map((l) => [l.id, l]));
        for (const it of page.items) byId.set(it.id, it);
        return Array.from(byId.values());
      });
    } catch {
      // Best-effort — the next scroll tries again.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreListings(false);
    }
  }

  function refreshListings() {
    setListingsError(false);
    setReloadKey((k) => k + 1);
  }

  // Warm the first thumbnails so cards appear with their photos, not empty boxes.
  const prefetched = useRef(new Set());
  useEffect(() => {
    if (!listings) return;
    for (const l of listings.slice(0, IMAGE_PREFETCH_COUNT)) {
      const uri = l.images?.[0] || l.photo;
      if (uri && !prefetched.current.has(uri)) {
        prefetched.current.add(uri);
        Image.prefetch(uri).catch(() => {});
      }
    }
  }, [listings]);

  // ---- Categories + Coin rate (public) ----
  const [categories, setCategories] = useState(() => getCached('categories') ?? []);
  useEffect(() => subscribeCategories((data) => {
    setCategories(data);
    setCached('categories', data);
  }, () => {}), []);

  const [coinMarket, setCoinMarket] = useState(() => getCached('coinMarket') ?? null);
  useEffect(() => subscribeCoinMarket((market) => {
    setCoinMarket(market);
    setCached('coinMarket', market);
  }), []);

  // ---- Signed-in data ----
  const [chats, chatsError] = useUserLive('chats', uid, subscribeChats);
  const [ads] = useUserLive('ads', uid, subscribeMyAds);
  const [favorites] = useUserLive('favorites', uid, subscribeFavorites);
  const [profile] = useUserLive('profile', uid, subscribeMyProfile);
  const [walletBalance] = useUserLive('walletBalance', uid, subscribeWalletBalance);
  const [walletTransactions] = useUserLive('walletTransactions', uid, subscribeWalletTransactions);
  const [coinBalance] = useUserLive('coinBalance', uid, subscribeCoinBalance);
  const [coinTransactions] = useUserLive('coinTransactions', uid, subscribeCoinTransactions);

  // Seller-level rating: a one-off read (same as web), seeded from the cache.
  const [sellerRating, setSellerRating] = useState(() => {
    const last = getLastUid();
    return (last && getCached(`sellerRating:${last}`)) || { avg: 0, count: 0 };
  });
  useEffect(() => {
    if (uid === null) { setSellerRating({ avg: 0, count: 0 }); return undefined; }
    if (!uid) return undefined;
    let cancelled = false;
    const cached = getCached(`sellerRating:${uid}`);
    if (cached) setSellerRating(cached);
    getSellerRating(uid).then((r) => {
      if (cancelled) return;
      setSellerRating(r);
      setCached(`sellerRating:${uid}`, r);
    });
    return () => { cancelled = true; };
  }, [uid]);

  // Remember which account the saved data belongs to (so the next launch can
  // show it before Firebase finishes restoring the login), and drop it all on logout.
  const lastSeenUid = useRef(null);
  useEffect(() => {
    if (uid) {
      lastSeenUid.current = uid;
      setLastUid(uid);
    } else if (uid === null) {
      const old = lastSeenUid.current || getLastUid();
      if (old) clearUserCache(old);
      lastSeenUid.current = null;
      setLastUid(null);
    }
  }, [uid]);

  const value = useMemo(() => ({
    listings, listingsError, hasMoreListings, loadingMoreListings, loadMoreListings, refreshListings,
    categories, coinMarket,
    chats, chatsError, ads, favorites, profile, sellerRating,
    walletBalance, walletTransactions, coinBalance, coinTransactions,
  // loadMoreListings/refreshListings only touch refs and setters, so they stay valid across renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    listings, listingsError, hasMoreListings, loadingMoreListings,
    categories, coinMarket,
    chats, chatsError, ads, favorites, profile, sellerRating,
    walletBalance, walletTransactions, coinBalance, coinTransactions,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
