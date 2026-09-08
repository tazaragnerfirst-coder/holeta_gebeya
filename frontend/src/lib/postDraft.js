// Lightweight autosave for the New-Post form (#hog007). Only used in
// new-post mode — edit mode already loads real data from Firestore,
// so it never touches this. Persists just the plain form fields, not
// photos: File objects can't survive localStorage, and base64-encoding
// them here risks blowing the quota on a multi-photo draft. Losing
// re-picked photos on an accidental back-navigation is an acceptable
// trade-off for keeping this simple.
const KEY = 'hg_postad_draft';
// A draft older than this is treated as stale and discarded on load
// rather than silently resuming a long-abandoned post (which could
// also carry a postType/category that's no longer valid).
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // Storage full or disabled — draft just won't persist this time.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
