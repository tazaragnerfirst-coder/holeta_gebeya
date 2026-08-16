// Detects when a new deploy has shipped while the app is already
// open, and force-reloads so the person always ends up on the
// latest code within seconds — without ever having to manually
// refresh. This matters especially for the Telegram Mini App: on
// reopen, Telegram often resumes a frozen WebView instead of doing
// a full page load, so a plain "browser cache" fix isn't enough —
// the app has to actively check and reload itself.
//
// How it works: the build writes /version.json (see
// scripts/gen-version.mjs) with a fresh id on every `npm run build`.
// That file is served with no-cache headers (firebase.json), so a
// fetch for it always hits the network. We record the id the app
// booted with, then compare against the current one whenever the
// tab becomes visible again and on a slow background interval. A
// mismatch means a newer build exists, so we reload.

const VERSION_URL = '/version.json';
const POLL_MS = 60 * 1000;

async function fetchVersion() {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version || null;
  } catch {
    return null;
  }
}

export async function initVersionWatch() {
  const bootVersion = await fetchVersion();
  if (!bootVersion) return; // couldn't determine it — don't risk reload-looping

  let checking = false;
  async function checkAndReload() {
    if (checking) return;
    checking = true;
    const latest = await fetchVersion();
    checking = false;
    if (latest && latest !== bootVersion) {
      window.location.reload();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkAndReload();
  });
  window.addEventListener('pageshow', checkAndReload);
  setInterval(checkAndReload, POLL_MS);
}
