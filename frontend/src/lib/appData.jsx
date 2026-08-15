import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUnsafeUserPreview } from './telegram';

const AppDataContext = createContext(null);

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
  const [listings, setListings] = useState([]);
  const [listingsReady, setListingsReady] = useState(false);

  const [registeredUid, setRegisteredUid] = useState(null);
  const [chats, setChats] = useState([]);
  const [chatsReady, setChatsReady] = useState(false);
  const [ads, setAds] = useState([]);
  const [adsReady, setAdsReady] = useState(false);

  const checkedSession = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setListingsReady(true);
    }, () => setListingsReady(true));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (checkedSession.current || !user) return;
      checkedSession.current = true;
      const tgUser = getUnsafeUserPreview();
      const expectedUid = tgUser ? `tg_${tgUser.id}` : null;
      if (expectedUid && user.uid !== expectedUid) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().phone) setRegisteredUid(user.uid);
      } catch {
        // Stay silent — page-level requireRegistered() flows still work normally.
      }
    });
    return unsub;
  }, []);

  // Called by the signup flow the instant a user completes
  // registration this session, so Chat/Dashboard start warming up
  // right away instead of waiting for a future app reload.
  function markRegistered(uid) {
    setRegisteredUid((prev) => prev || uid);
  }

  useEffect(() => {
    if (!registeredUid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', registeredUid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setChatsReady(true);
    }, () => setChatsReady(true));
    return unsub;
  }, [registeredUid]);

  useEffect(() => {
    if (!registeredUid) return;
    const q = query(collection(db, 'listings'), where('sellerId', '==', registeredUid));
    const unsub = onSnapshot(q, (snap) => {
      setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAdsReady(true);
    }, () => setAdsReady(true));
    return unsub;
  }, [registeredUid]);

  return (
    <AppDataContext.Provider value={{
      listings, listingsReady,
      registeredUid, markRegistered,
      chats, chatsReady,
      ads, adsReady,
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
