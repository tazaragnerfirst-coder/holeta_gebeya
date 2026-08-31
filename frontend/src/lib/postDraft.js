// Lightweight autosave for the New-Post form (#hog007). Only used in
// new-post mode — edit mode already loads real data from Firestore,
// so it never touches this. Persists just the plain form fields, not
// photos: File objects can't survive localStorage, and base64-encoding
// them here risks blowing the quota on a multi-photo draft. Losing
// re-picked photos on an accidental back-navigation is an acceptable
// trade-off for keeping this simple.
const KEY = 'hg_postad_draft';

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or disabled — draft just won't persist this time.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
