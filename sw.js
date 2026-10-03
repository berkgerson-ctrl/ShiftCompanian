// Service worker: the app shell works offline.
// Bump VERSION on every release so installed copies pick up the update.
const VERSION = 'sc-v1';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'js/sync.js', 'js/firebase-config.js',
  'js/vendor/xlsx.full.min.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for our own files and the Firebase SDK modules.
// Firestore / Auth API traffic is never cached.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const own = u.origin === location.origin;
  const sdk = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');
  if (!own && !sdk) return;
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => hit || caches.match('index.html'));
    return hit || net;
  }));
});
