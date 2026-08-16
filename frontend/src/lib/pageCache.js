// Two-tier cache: an in-memory Map for instant reads during the
// session, backed by localStorage so the same last-known data also
// survives a full app reload/cold start (a Telegram Mini App reopen
// is a fresh JS load, not a backgrounded app — an in-memory-only
// cache would be empty every single time). Lets a page show cached
// data immediately instead of flashing its skeleton, while a live
// listener/fetch quietly refreshes it in the background.
const cache = new Map();
const PREFIX = 'hg_cache:';

export function getCached(key) {
  if (cache.has(key)) return cache.get(key);
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) {
      const value = JSON.parse(raw);
      cache.set(key, value);
      return value;
    }
  } catch {
    // Private-browsing / storage-disabled — fall through to no cache.
  }
  return undefined;
}

export function setCached(key, value) {
  cache.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or disabled — in-memory cache above still works
    // for the rest of this session.
  }
}
