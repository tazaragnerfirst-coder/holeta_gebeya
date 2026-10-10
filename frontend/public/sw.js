// Offline app shell for the installed app (PWA / APK web view).
//  - The app's own files (hashed /assets/*, icons) are cached and served
//    cache-first, so the app opens with no network.
//  - Page loads (navigation) are network-first, falling back to the cached
//    shell when offline, so a new deploy is picked up as soon as there is a
//    connection.
//  - version.json and every other origin (Firestore, Render, Telegram) always
//    go straight to the network. Data offline comes from Firestore's own
//    persistent cache (see lib/firebase.js), not from this worker.
const CACHE = 'hg-shell-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putCopy(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/version.json') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => putCopy('/index.html', res))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => putCopy(req, res)))
    );
  }
});
