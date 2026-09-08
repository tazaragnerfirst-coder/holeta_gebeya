// Lightweight autosave for the New-Post form (#hog007). Only used in
// new-post mode — edit mode already loads real data from Firestore,
// so it never touches this. Persists just the plain form fields, not
// photos: File objects can't survive storage, and base64-encoding
// them here risks blowing the quota on a multi-photo draft. Losing
// re-picked photos on an accidental back-navigation is an acceptable
// trade-off for keeping this simple.
//
// sessionStorage, not localStorage: the draft only needs to survive
// an accidental refresh/reload of the same session. It should not
// outlive that session (a long-abandoned draft could carry a
// postType/category that's no longer valid) — sessionStorage clears
// itself once the tab/app is actually closed, so no manual expiry
// logic is needed here.
const KEY = 'hg_postad_draft';

export function loadDraft() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(data) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or disabled — draft just won't persist this time.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
