import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';

// Native counterpart of frontend/src/lib/pageCache.js: an in-memory Map for
// instant reads during the session, backed by AsyncStorage so the same
// last-known data survives a cold start. AsyncStorage is async, so the app
// calls hydrateCache() once before it renders; after that getCached() is
// synchronous and a screen can paint cached data on its very first frame
// instead of flashing a loader while a live listener quietly refreshes it.
//
// Like the web cache it only shaves the first paint — it is never the final
// answer. Two safety nets stop old data from living forever:
//   - CACHE_VERSION: bump when a cached shape changes; older entries are ignored.
//   - CACHE_TTL_MS: an entry older than this is ignored even if the version matches.
const mem = new Map();
const PREFIX = 'hg_cache:';
const LAST_UID_KEY = 'hg_last_uid';
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (stale data only paints the first frame; listeners refresh it right after launch)

let lastUid = null;

// Firestore Timestamps lose their methods in plain JSON (toMillis/toDate),
// and the screens call those — so they are written as { __ts: [s, ns] } and
// turned back into real Timestamps when read.
function replacer(key, value) {
  const original = this[key];
  const isTs = original instanceof Timestamp
    || (original && typeof original === 'object' && typeof original.toMillis === 'function'
      && typeof original.seconds === 'number' && typeof original.nanoseconds === 'number');
  if (isTs) return { __ts: [original.seconds, original.nanoseconds] };
  return value;
}
function reviver(key, value) {
  if (value && typeof value === 'object' && Array.isArray(value.__ts) && value.__ts.length === 2) {
    return new Timestamp(value.__ts[0], value.__ts[1]);
  }
  return value;
}

// Loads everything saved last time into memory. Never throws; capped by a
// short timeout so a slow disk can't hold the splash screen.
export async function hydrateCache() {
  const load = async () => {
    try {
      lastUid = await AsyncStorage.getItem(LAST_UID_KEY);
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      if (keys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, raw] of pairs) {
        if (raw == null) continue;
        try {
          mem.set(k.slice(PREFIX.length), JSON.parse(raw, reviver));
        } catch {
          // Corrupt entry — skip it.
        }
      }
    } catch {
      // Storage unavailable — the app just starts with an empty cache.
    }
  };
  await Promise.race([load(), new Promise((resolve) => setTimeout(resolve, 1500))]);
}

export function getCached(key) {
  const entry = mem.get(key);
  if (!entry || entry.v !== CACHE_VERSION) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return undefined;
  return entry.value;
}

const timers = new Map();

export function setCached(key, value) {
  const entry = { v: CACHE_VERSION, ts: Date.now(), value };
  mem.set(key, entry);
  // Disk writes are debounced per key — a busy listener can fire many times a second.
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    try {
      AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry, replacer)).catch(() => {});
    } catch {
      // Not serializable / storage full — the in-memory copy still works this session.
    }
  }, 400));
}

// Which account the saved user data belongs to, so the very first frame
// after launch can show it before Firebase has finished restoring the login.
export function getLastUid() { return lastUid; }
export function setLastUid(uid) {
  lastUid = uid || null;
  if (uid) AsyncStorage.setItem(LAST_UID_KEY, uid).catch(() => {});
  else AsyncStorage.removeItem(LAST_UID_KEY).catch(() => {});
}

// Logout: forget everything that was saved for this account.
export function clearUserCache(uid) {
  if (!uid) return;
  const suffix = `:${uid}`;
  const drop = [];
  for (const key of mem.keys()) {
    if (key.endsWith(suffix) || key.includes(`:${uid}:`)) drop.push(key);
  }
  for (const key of drop) {
    mem.delete(key);
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
  AsyncStorage.multiRemove(drop.map((k) => PREFIX + k)).catch(() => {});
}
