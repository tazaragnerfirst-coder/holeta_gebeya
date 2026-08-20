// Local, device-only toggle for "vibrant" UI flourishes (planned:
// livelier animation on things like error/empty states). No visual
// behavior reads this yet — this just persists the on/off choice so
// the Settings toggle has somewhere real to write to; animations
// wire up to it later without touching this file.
const KEY = 'hg_vibrant';

export function getVibrant() {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setVibrant(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
}
