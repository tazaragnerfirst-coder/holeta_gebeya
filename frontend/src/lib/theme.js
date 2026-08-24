// Display theme: 'light' | 'dark' | 'system'. Persisted per device.
// 'system' follows the OS/browser color-scheme preference and keeps
// following it live if the user changes it while the app is open.
const KEY = 'hg_theme';
const MEDIA = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

function resolve(theme) {
  return theme === 'system' ? (MEDIA?.matches ? 'dark' : 'light') : theme;
}

function paint(theme) {
  document.documentElement.setAttribute('data-theme', resolve(theme));
}

let systemListenerAttached = false;

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch {}
  paint(theme);
}

// Call once at startup: paints the current choice and, if it's
// 'system', keeps repainting live as the OS preference flips.
export function initTheme() {
  paint(getTheme());
  if (!systemListenerAttached && MEDIA) {
    systemListenerAttached = true;
    MEDIA.addEventListener('change', () => {
      if (getTheme() === 'system') paint('system');
    });
  }
}
