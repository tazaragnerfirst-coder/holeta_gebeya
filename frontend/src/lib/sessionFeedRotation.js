// #hog003 — light feed rotation, session-only.
//
// In-memory only (module-scope Map) — resets on tab close/reload, never
// written to Firestore or localStorage. No per-user profiling, no
// cross-session history: this only ever knows about "this tab, right
// now". Purpose: stop the exact same handful of un-boosted listings
// from sitting at the front of Home on every refresh — nudge an
// over-shown listing down once it's been seen a few times, nothing
// more elaborate than that.

const impressions = new Map();

// How many times a listing can appear at the front of the feed this
// session before it starts getting pushed down.
const OVEREXPOSED_AFTER = 3;

// Called once the front-of-feed listings have actually been on screen
// for a moment (caller debounces this — a fast flick-through shouldn't
// count). Boosted listings are recorded too (harmless) but rotate()
// below never acts on them.
export function recordImpressions(ids) {
  for (const id of ids) {
    impressions.set(id, (impressions.get(id) || 0) + 1);
  }
}

// Returns a reordered copy of `items`: anything seen OVEREXPOSED_AFTER+
// times this session sinks below everything else that hasn't, original
// relative order preserved on both sides of that split (stable) so the
// list doesn't jitter unnecessarily between renders. `boostedIds` are
// always left in place — boosted listings paid for visibility, so this
// rotation never demotes them.
export function rotate(items, boostedIds) {
  return items
    .map((item, index) => ({
      item,
      index,
      overexposed: !boostedIds?.has(item.id) && (impressions.get(item.id) || 0) >= OVEREXPOSED_AFTER,
    }))
    .sort((a, b) => {
      if (a.overexposed !== b.overexposed) return a.overexposed ? 1 : -1;
      return a.index - b.index;
    })
    .map((x) => x.item);
}
