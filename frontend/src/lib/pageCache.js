// Module-level (in-memory, survives component unmount but not a full
// page reload) cache. Lets a page show cached data immediately on a
// revisit instead of flashing its skeleton every time you navigate
// back to it, while still quietly re-fetching in the background to
// keep the data fresh.
const cache = new Map();

export function getCached(key) {
  return cache.has(key) ? cache.get(key) : undefined;
}

export function setCached(key, value) {
  cache.set(key, value);
}
