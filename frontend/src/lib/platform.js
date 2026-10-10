// Where is this build running?
//  - Telegram Mini App: the Telegram WebView injects initData. Identity comes
//    from Telegram automatically (silent login), exactly as before.
//  - Standalone: installed PWA, Android APK, or a plain browser. There is no
//    initData, so the person logs in once through the Telegram bot.
//  - Native: the Android APK build. Set VITE_NATIVE=1 at build time. The web
//    app is bundled inside the APK (no remote site), so routing uses hash
//    URLs and the web version-polling reload is turned off.

export const IS_NATIVE = import.meta.env.VITE_NATIVE === '1';

export function isInTelegram() {
  return Boolean(typeof window !== 'undefined' && window.Telegram?.WebApp?.initData);
}
