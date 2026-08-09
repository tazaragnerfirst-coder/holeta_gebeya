// Thin wrapper around the Telegram Web App JS SDK.
// Docs: https://core.telegram.org/bots/webapps
// Load the SDK script in index.html: <script src="https://telegram.org/js/telegram-web-app.js"></script>

export function getTelegramWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  tg.ready();
  tg.expand();
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
