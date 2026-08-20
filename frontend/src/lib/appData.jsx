import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUnsafeUserPreview } from './telegram';
import { getCached, setCached } from './pageCache';
import { subscribeFavorites } from './favorites';
import { isActiveAd } from './adStatus';

const AppDataContext = createContext(null);

const REG_KEY = 'hg_registered:';

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
  const [listings, setListings] = useState(() => getCached('listings') || []);
  const [listingsReady, setListingsReady] = useState(() => getCached('listings') != null);

  const initialUid = knownRegisteredUid();
  const [registeredUid, setRegisteredUid] = useState(initialUid);
  const [chats, setChats] = useState(() => (initialUid ? getCached(`chats:${initialUid}`) || [] : []));
  const [chatsReady, setChatsReady] = useState(() => (initialUid ? getCached(`chats:${initialUid}`) != null : false));
  const [ads, setAds] = useState(() => (initialUid ? getCached(`ads:${initialUid}`) || [] : []));
  const [adsReady, setAdsReady] = useState(() => (initialUid ? getCached(`ads:${initialUid}`) != null : false));
  const [favorites, setFavorites] = useState(() => (initialUid ? getCached(`favorites:${initialUid}`) || [] : []));
  const [favoritesReady, setFavoritesReady] = useState(() => (initialUid ? getCached(`favorites:${initialUid}`) != null : false));

  const checkedSession = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      // Paused (and expired) listings stay in Firestore for the
      // seller to manage, but shouldn't show up in the public feed.
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveAd);
      setListings(data);
      setListingsReady(true);
      setCached('listings', data);
    }, () => setListingsReady(true));
    return unsub;
  }, []);

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

  return (
    <AppDataContext.Provider value={{
      listings, listingsReady,
      registeredUid, markRegistered, clearRegistered,
      chats, chatsReady,
      ads, adsReady,
      favorites, favoritesReady,
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
