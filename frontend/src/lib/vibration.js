// Device-only toggle for haptic feedback (phone vibration / Telegram
// HapticFeedback buzzes). Was mislabeled "Vibrant" and unwired — this
// is the real thing: hapticSuccess/hapticError/hapticImpact in
// telegram.js check getVibration() before firing, so turning this
// off silences every buzz in the app (error banners, success toasts,
// button impacts).
const KEY = 'hg_vibration';

export function getVibration() {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setVibration(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
}
