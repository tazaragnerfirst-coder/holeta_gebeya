// Minimal service worker — exists so browsers treat the site as an
// installable app. It deliberately does NOT cache anything: the app
// ships updates through lib/appVersion.js (version.json polling), and a
// caching worker would fight that. Every request goes straight to network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
