// Thin wrapper around the Telegram Web App JS SDK.
// Docs: https://core.telegram.org/bots/webapps
// Load the SDK script in index.html: <script src="https://telegram.org/js/telegram-web-app.js"></script>

export function getTelegramWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

// Mini Apps render full-screen under Telegram's own native header bar
// (the Close/chevron/more-options row). That bar's height is exposed
// via `contentSafeAreaInset.top` on modern clients (Bot API 8.0+).
// We mirror it into a CSS var so our own header can pad below it
// instead of being covered by it. Falls back to a sensible constant
// on older clients that don't expose the API yet.
function applySafeArea(tg) {
  const root = document.documentElement;
  const content = tg?.contentSafeAreaInset;
  const device = tg?.safeAreaInset;
  const top = (content?.top ?? 0) + (device?.top ?? 0);
  const bottom = (content?.bottom ?? 0) + (device?.bottom ?? 0);
  // Older Telegram clients report 0/undefined even though the native
  // header is still drawn on top of the webview — 44px covers that
  // bar comfortably without over-padding on clients that do report it.
  root.style.setProperty('--tg-safe-top', `${top > 0 ? top : 44}px`);
  root.style.setProperty('--tg-safe-bottom', `${bottom}px`);
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  tg.ready();
  tg.expand();
  // Telegram's own vertical-swipe gesture closes the whole Mini App
  // when the user drags down from the top of a page. Our pages
  // implement their own swipe-down-to-go-home behaviour (see
  // usePullToGoHome), so the native one needs to be off or the two
  // fight each other and the app just closes instead.
  tg.disableVerticalSwipes?.();
  applySafeArea(tg);
  tg.onEvent?.('safeAreaChanged', () => applySafeArea(tg));
  tg.onEvent?.('contentSafeAreaChanged', () => applySafeArea(tg));
  return tg;
}

// Raw initData string — sent to the backend for HMAC verification.
// This is the ONLY trustworthy way to identify the user; never trust
// window.Telegram.WebApp.initDataUnsafe on its own for auth decisions.
export function getInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || '';
}

// Convenience read-only user preview for UI (avatar/name) BEFORE the
// backend has verified anything. Do not use for authorization.
export function getUnsafeUserPreview() {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
}

export function hapticSuccess() {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred('success');
}
export function hapticImpact(style = 'light') {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}
