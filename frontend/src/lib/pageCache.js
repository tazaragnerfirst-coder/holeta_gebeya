// Two-tier cache: an in-memory Map for instant reads during the
// session, backed by localStorage so the same last-known data also
// survives a full app reload/cold start (a Telegram Mini App reopen
// is a fresh JS load, not a backgrounded app — an in-memory-only
// cache would be empty every single time). Lets a page show cached
// data immediately instead of flashing its skeleton, while a live
// listener/fetch quietly refreshes it in the background.
//
// This cache exists ONLY to shave the initial paint delay — it is
// never the final answer. Two safety nets keep it from ever showing
// old data forever:
//   - CACHE_VERSION: bump this whenever a cached shape changes
//     (new/renamed fields, a data migration, a bulk delete like a
//     chats wipe). Old entries written under a previous version are
//     ignored automatically, no manual cache-clearing needed.
//   - CACHE_TTL_MS: an entry older than this is ignored even if the
//     version matches, so a listener that never got a chance to
//     reconnect (e.g. a frozen/backgrounded WebView) can't leave
//     stale data on screen indefinitely.
const cache = new Map();
const PREFIX = 'hg_cache:';
const CACHE_VERSION = 2;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCached(key) {
  let entry = cache.has(key) ? cache.get(key) : undefined;
  if (entry === undefined) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) {
        entry = JSON.parse(raw);
        cache.set(key, entry);
      }
    } catch {
      // Private-browsing / storage-disabled — fall through to no cache.
    }
  }
  if (!entry || entry.v !== CACHE_VERSION) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return undefined;
  return entry.value;
}

export function setCached(key, value) {
  const entry = { v: CACHE_VERSION, ts: Date.now(), value };
  cache.set(key, entry);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or disabled — in-memory cache above still works
    // for the rest of this session.
  }
}
